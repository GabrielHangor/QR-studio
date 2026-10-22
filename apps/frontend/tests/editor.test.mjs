import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

import { editorLogoPresets } from "../src/logo-presets.ts";
import { editorPresets } from "../src/presets.ts";

async function stubMapTiles(page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
}

let server;
let browser;
let baseUrl;
before(async () => {
  await prepareZXingModule({
    overrides: {
      wasmBinary: await readFile(
        fileURLToPath(import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm")),
      ),
    },
    fireImmediately: true,
  });
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  await server.listen();
  baseUrl = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function open(page, name) {
  await settleLayout(page);
  const button = page.getByRole("button", { name, exact: true });
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await page.getByRole("button", { name, exact: true, expanded: true }).waitFor();
  assert.equal(
    await page
      .locator('[aria-label="Настройки QR"] [data-slot="trigger"][aria-expanded="true"]')
      .count(),
    1,
  );
}
async function pick(page, label, name) {
  const group = page.getByRole("radiogroup", { name: label, exact: true });
  await group
    .locator('[data-slot="item"]')
    .filter({ has: page.getByRole("radio", { name, exact: true }) })
    .click();
  await group.getByRole("radio", { name, exact: true, checked: true }).waitFor();
}
async function select(page, label, name, root = page) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await root.getByRole("option", { name, exact: true }).click();
}
const previewOf = (page) => page.getByRole("img", { name: "Предпросмотр QR-кода" });
async function svgOf(page) {
  return decodeURIComponent((await previewOf(page).getAttribute("src")).split(",")[1]);
}

const contrast = (first, second) => {
  const luminance = (color) => {
    const channels = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].toSorted((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
};

async function settleLayout(page) {
  await page.waitForFunction(() => document.fonts.status === "loaded", undefined, {
    timeout: 5000,
  });
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          (animation) =>
            animation.playState !== "running" ||
            !Number.isFinite(animation.effect?.getComputedTiming().endTime),
        ),
    undefined,
    { timeout: 3000 },
  );
}

for (const width of [1280, 390]) {
  it(`shows a success badge only for a matching browser scan at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    // Only the browser API is controlled here; export decoding is tested separately with ZXing.
    await context.addInitScript(() => {
      globalThis.BarcodeDetector = class {
        static async getSupportedFormats() {
          return ["qr_code"];
        }
        async detect() {
          return new Promise((resolve) => {
            globalThis.finishQrScan = () => {
              globalThis.finishQrScan = undefined;
              resolve([{ rawValue: "https://example.com" }]);
            };
          });
        }
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    try {
      await page.goto(baseUrl);
      await previewOf(page).waitFor();
      const badge = page.getByText("QR-код распознан", { exact: true });
      assert.equal(await badge.count(), 0);
      const button = page.getByRole("button", { name: "Проверить считывание", exact: true });
      await button.scrollIntoViewIfNeeded();
      await settleLayout(page);
      const geometry = async () => {
        const card = await page.locator('[aria-label="Предпросмотр"]').boundingBox();
        const image = await previewOf(page).boundingBox();
        const action = await button.boundingBox();
        return [
          card.width,
          card.height,
          image.x - card.x,
          image.y - card.y,
          image.width,
          image.height,
          action.x - card.x,
          action.y - card.y,
          action.width,
          action.height,
        ].map((value) => Math.round(value * 100) / 100);
      };
      const initialGeometry = await geometry();
      await button.click();
      await page.waitForFunction(() => typeof globalThis.finishQrScan === "function");
      assert.deepEqual(
        await geometry(),
        initialGeometry,
        "Starting a scan must not resize or move the preview or controls",
      );
      await page.evaluate(() => globalThis.finishQrScan());
      await badge.waitFor();
      assert.deepEqual(
        await geometry(),
        initialGeometry,
        "Scan results must not resize or move the preview or controls",
      );
      assert.match(await badge.locator("..").getAttribute("class"), /text-success/);
      await page
        .getByText("Дополнительно проверьте QR-код на нескольких телефонах.", { exact: true })
        .waitFor();
      if (width === 1280) {
        await settleLayout(page);
        await page.screenshot({ path: "test-results/editor-scan-success.png", fullPage: true });
      }
      await open(page, "Содержимое");
      await page.getByRole("textbox", { name: /^Ссылка/ }).fill("https://example.org");
      await badge.waitFor({ state: "detached" });
      await page.getByRole("button", { name: "Проверить считывание", exact: true }).click();
      await page.waitForFunction(() => typeof globalThis.finishQrScan === "function");
      await page.evaluate(() => globalThis.finishQrScan());
      await page
        .getByText("Распознанное содержимое не совпадает. Измените дизайн и проверьте снова.", {
          exact: true,
        })
        .waitFor();
      assert.equal(await badge.count(), 0, "A mismatch must not retain the green success badge");
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    } finally {
      await context.close();
    }
  });
}

for (const [width, height] of [
  [1280, 720],
  [1440, 900],
  [1024, 600],
]) {
  it(`fits the preview and export actions in a ${width} x ${height} viewport`, async () => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    try {
      await page.goto(baseUrl);
      await previewOf(page).waitFor();
      await settleLayout(page);
      const card = page.locator('[aria-label="Предпросмотр"]');
      const box = await card.boundingBox();
      assert.ok(
        box.y + box.height <= height,
        `Preview bottom ${box.y + box.height} exceeds ${height}`,
      );
      const png = page.getByRole("button", { name: "Скачать PNG", exact: true });
      assert.ok((await png.boundingBox()).y + (await png.boundingBox()).height <= height);
      assert.ok(
        (await previewOf(page).boundingBox()).height >= 96,
        "The QR retains a usable preview size",
      );
      const previewBefore = await previewOf(page).boundingBox();
      const slider = page.getByRole("slider", { name: "Размер PNG", exact: true });
      assert.ok((await slider.boundingBox()).height >= 12, "The slider theme is rendered");
      await slider.press("End");
      await previewOf(page).evaluate((image) => image.decode());
      const previewAfter = await previewOf(page).boundingBox();
      assert.equal(previewBefore.width, previewAfter.width);
      assert.equal(previewBefore.height, previewAfter.height);
      assert.match(
        await page.getByLabel("Размер изображения", { exact: true }).innerText(),
        /^2048 × 2048 пкс$/,
      );
      await open(page, "Цвета");
      const swatch = await page
        .getByRole("button", { name: "Цвет элементов #1e40af", exact: true })
        .boundingBox();
      assert.equal(swatch.width, 32);
      assert.equal(swatch.height, 32);
      if (width === 1280) {
        await settleLayout(page);
        await page.screenshot({ path: "test-results/editor-compact-colors.png", fullPage: true });
      }
      await open(page, "Форма и рамка");
      await pick(page, "Форма рамок маркеров", "Круги");
      await settleLayout(page);
      assert.equal(
        await page.getByRole("radiogroup").locator('[data-slot="indicator"]:visible').count(),
        0,
        "Card pickers do not render a second radio indicator over the thumbnail",
      );
      const images = await page
        .getByRole("radiogroup", { name: "Форма рамок маркеров", exact: true })
        .locator("img")
        .all();
      for (const image of images) {
        /* oxlint-disable no-await-in-loop -- Check each visible card's geometry. */
        const bounds = await image.boundingBox();
        assert.equal(bounds.width, 32);
        assert.equal(bounds.height, 32);
        /* oxlint-enable no-await-in-loop */
      }
      const styledBox = await card.boundingBox();
      assert.ok(styledBox.y + styledBox.height <= height);
      assert.ok(
        (await previewOf(page).boundingBox()).height >= 80,
        "Recommendations must not collapse the QR image",
      );
      if (width === 1280) {
        await page.screenshot({ path: "test-results/editor-clean-shapes.png", fullPage: true });
      }
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  describe(`QR editor at ${width}px`, () => {
    it("updates preview, retains drafts, removes stale QR and recovers", async () => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "ru-RU",
        timezoneId: "UTC",
      });
      const external = [];
      const errors = [];
      await context.route("**/*", (route) => {
        if (
          route.request().url().startsWith(baseUrl) ||
          route.request().url().startsWith("data:")
        ) {
          return route.continue();
        }
        external.push(route.request().url());
        return route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(baseUrl);
        const preview = previewOf(page);
        await preview.waitFor();
        assert.equal(await page.getByText("Исходный SVG", { exact: true }).count(), 0);
        assert.equal(await page.getByText("Показатели QR", { exact: true }).count(), 0);
        assert.equal(await page.getByText("Открыть SVG", { exact: true }).count(), 0);
        assert.equal(
          await page
            .locator('[aria-label="Предпросмотр"]')
            .getByRole("slider", { name: "Размер PNG", exact: true })
            .count(),
          1,
        );
        assert.equal(
          await page.getByRole("combobox", { name: "Пример содержимого", exact: true }).count(),
          0,
        );
        const url = page.getByRole("textbox", { name: /^Ссылка/ });
        assert.equal(await url.inputValue(), "https://example.com");
        await url.fill("https://");
        await url.blur();
        await preview.waitFor({ state: "detached" });
        await url.fill("https://example.org");
        await preview.waitFor();
        await page.getByRole("tab", { name: "Текст", exact: true }).click();
        const text = page.getByRole("textbox", { name: /^Текст/ });
        const payload = "  Привет 👋\nВторая строка  ";
        await text.fill(payload);
        await open(page, "Форма и рамка");
        await pick(page, "Форма элементов", "Сглаженные");
        await page.getByRole("tab", { name: "Ссылка", exact: true }).click();
        assert.equal(await url.inputValue(), "https://example.org");
        await page.getByRole("tab", { name: "Текст", exact: true }).click();
        assert.equal(await text.inputValue(), payload);
        await text.fill("x".repeat(5000));
        await preview.waitFor({ state: "detached" });
        assert.equal(
          await page.getByRole("button", { name: "Скачать PNG", exact: true }).isDisabled(),
          true,
        );
        await text.fill("Recovered");
        await preview.waitFor();
        await text.fill("");
        await preview.waitFor({ state: "detached" });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        assert.deepEqual(external, []);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  });
}

for (const width of [1920, 1440, 768, 390]) {
  it(`keeps one panel open and supports cards and help at ${width}px`, async () => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      locale: "ru-RU",
      hasTouch: width < 1024,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    try {
      await page.goto(baseUrl);
      await previewOf(page).waitFor();
      await open(page, "Содержимое");
      const closedHeight = await page
        .getByRole("button", { name: "Логотип", exact: true })
        .evaluate((button) => button.closest('[data-slot="item"]').getBoundingClientRect().height);
      assert.ok(closedHeight < 70, "Collapsed panels should not retain body padding");
      const tabsRoot = page.locator('[aria-label="Тип содержимого"]');
      assert.equal(
        await tabsRoot.locator('[data-slot="indicator"]:visible').count(),
        0,
        "Wrapped tabs use per-button selection backgrounds",
      );
      const tabs = await tabsRoot.boundingBox();
      const content = await page
        .getByRole("button", { name: "Содержимое", exact: true })
        .boundingBox();
      assert.ok(tabs.y < content.y);
      if (width >= 1024) {
        const preview = await page
          .getByRole("heading", { name: "Предпросмотр", exact: true })
          .boundingBox();
        assert.ok(content.x < preview.x && Math.abs(content.y - preview.y) < 25);
      }
      await open(page, "Шаблоны");
      assert.equal(
        await page
          .getByRole("radiogroup", { name: "Шаблоны", exact: true })
          .getByRole("radio")
          .count(),
        20,
      );
      assert.equal(await page.getByText(/ATELIER|COFFEE/).count(), 0);
      await pick(page, "Шаблоны", "Кофейня");
      if (width === 1920 || width === 390) {
        await settleLayout(page);
        await page
          .getByRole("heading", { name: "Создайте QR-код", exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/editor-${width}.png` });
      }
      await open(page, "Цвета");
      await page.getByRole("button", { name: "Цвет элементов #1e40af", exact: true }).click();
      assert.equal(
        (
          await page.getByRole("button", { name: "Цвет элементов", exact: true }).textContent()
        ).trim(),
        "#1E40AF",
      );
      await open(page, "Форма и рамка");
      const group = page.getByRole("radiogroup", { name: "Форма элементов", exact: true });
      assert.equal(await group.getByRole("radio").count(), 10);
      const selected = group.getByRole("radio", { checked: true });
      await selected.focus();
      await selected.press("ArrowRight", { delay: 50 });
      await group.getByRole("radio", { name: "Круги", exact: true, checked: true }).waitFor();
      if (width === 1920) await page.screenshot({ path: "test-results/editor-shapes-1920.png" });
      await open(page, "Параметры QR-кода");
      assert.equal(
        await page
          .getByRole("spinbutton", { name: "Плотность кода (версия)", exact: true })
          .count(),
        0,
      );
      const help = page.getByRole("button", {
        name: "Пояснение: Свободное поле, модули",
        exact: true,
      });
      if (width < 1024) await help.tap();
      else await help.focus();
      await page.getByRole("tooltip").waitFor();
      assert.match(await page.getByRole("tooltip").innerText(), /Минимальная ширина — 4 модуля/);
      await help.press("Escape");
      await page.getByRole("tooltip").waitFor({ state: "detached" });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`customizes and exports a design through the accordion at ${width}px`, async () => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      locale: "ru-RU",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(baseUrl);
      await page.getByRole("tab", { name: "Текст", exact: true }).click();
      const payload = "  Привет 👋\nQR Studio  ";
      await page.getByRole("textbox", { name: /^Текст/ }).fill(payload);
      await open(page, "Шаблоны");
      /* oxlint-disable no-await-in-loop -- One page models sequential user choices. */
      for (const preset of editorPresets) {
        await pick(page, "Шаблоны", preset.title);
        await previewOf(page).evaluate((image) => image.decode());
      }
      /* oxlint-enable no-await-in-loop */
      await pick(page, "Шаблоны", "Кофейня");
      await open(page, "Содержимое");
      assert.equal(await page.getByRole("textbox", { name: /^Текст/ }).inputValue(), payload);
      await open(page, "Цвета");
      await select(page, "Цвет или градиент", "Слева направо");
      await page.getByRole("button", { name: "Цвет элементов #1e40af", exact: true }).click();
      assert.equal(
        await page.getByRole("switch", { name: "Отдельный цвет рамок", exact: true }).isVisible(),
        false,
      );
      await page
        .locator("summary")
        .filter({ hasText: /^Цвета поисковых маркеров$/ })
        .click();
      await page.getByRole("switch", { name: "Отдельный цвет рамок", exact: true }).click();
      await page.getByRole("button", { name: "Цвет рамок маркеров", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Цвет рамок маркеров (HEX)", exact: true })
        .fill("#123456");
      await page.keyboard.press("Escape");
      await page
        .locator("summary")
        .filter({ hasText: /^Цвета поисковых маркеров$/ })
        .click();
      assert.ok(
        (await svgOf(page)).includes("#123456"),
        "Collapsing advanced colors preserves the design",
      );
      assert.equal(
        await page
          .getByRole("switch", { name: "Отдельный фон композиции", exact: true })
          .isVisible(),
        false,
      );
      await page
        .locator("summary")
        .filter({ hasText: /^Фон композиции$/ })
        .click();
      await page.getByRole("switch", { name: "Отдельный фон композиции", exact: true }).click();
      await page.getByRole("button", { name: "Цвет фона композиции #faf6ed", exact: true }).click();
      await page
        .locator("summary")
        .filter({ hasText: /^Фон композиции$/ })
        .click();
      await open(page, "Форма и рамка");
      await pick(page, "Форма элементов", "Зеркальные лепестки");
      await pick(page, "Форма рамок маркеров", "Сглаженные");
      await pick(page, "Форма центров маркеров", "Лепестки");
      await pick(page, "Форма композиции", "Круг");
      const recommendations = page.getByRole("region", { name: "Рекомендации", exact: true });
      await recommendations.getByText("Проверьте оформление", { exact: true }).waitFor();
      assert.equal(
        await recommendations.getByRole("button").count(),
        0,
        "Recommendations are visible without expanding a panel",
      );
      const staticHint = page.getByText("После скачивания содержимое QR-кода изменить нельзя.", {
        exact: true,
      });
      assert.ok(
        (await recommendations.boundingBox()).y -
          ((await staticHint.boundingBox()).y + (await staticHint.boundingBox()).height) <
          28,
        "Recommendations follow export actions without an empty feedback spacer",
      );
      assert.equal(
        await recommendations.getByRole("listitem").count(),
        1,
        "Three styling notices are combined",
      );
      assert.match(await recommendations.innerText(), /проверьте QR-код камерой телефона/);
      await select(page, "Рамка", "Пунктирная");
      await page.getByRole("spinbutton", { name: "Толщина рамки, пкс", exact: true }).fill("3");
      if (width >= 1280) {
        await settleLayout(page);
        const shapePanel = page
          .getByRole("button", { name: "Форма и рамка", exact: true })
          .locator('xpath=ancestor::*[@data-slot="item"][1]');
        assert.ok(
          (await shapePanel.boundingBox()).height < 560,
          "The shape panel remains compact with a frame",
        );
      }
      await open(page, "Логотип");
      const png = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#123456";
        ctx.fillRect(4, 4, 16, 8);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      const file = page.getByLabel("Файл логотипа", { exact: true });
      await file.setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
      await previewOf(page).waitFor();
      const clear = page.getByRole("switch", {
        name: "Очистить область под логотипом",
        exact: true,
      });
      await clear.waitFor();
      assert.equal(
        await recommendations.getByRole("listitem").count(),
        2,
        "The specific logo warning remains visible",
      );
      const slider = page.getByRole("slider", { name: "Размер логотипа", exact: true });
      await slider.press("ArrowLeft");
      assert.equal(await slider.getAttribute("aria-valuenow"), "3.5");
      assert.equal(
        await page
          .getByRole("spinbutton", { name: "Ширина логотипа, модули", exact: true })
          .isVisible(),
        false,
      );
      const logoPanel = page
        .getByRole("button", { name: "Логотип", exact: true })
        .locator('xpath=ancestor::*[@data-slot="item"][1]');
      await logoPanel.locator("summary").click();
      const logoWidth = page.getByRole("spinbutton", {
        name: "Ширина логотипа, модули",
        exact: true,
      });
      assert.equal(await logoWidth.inputValue(), "3.5");
      await logoWidth.fill("5");
      assert.equal(await slider.getAttribute("aria-valuenow"), "5");
      await logoPanel.locator("summary").click();
      assert.equal(await clear.isChecked(), true);
      assert.ok((await svgOf(page)).includes('data-qr-logo-clear="true"'));
      await clear.click();
      await page.waitForFunction(() =>
        decodeURIComponent(document.querySelector('img[alt="Предпросмотр QR-кода"]').src).includes(
          'data-qr-logo-clear="false"',
        ),
      );
      await clear.click();
      await open(page, "Подписи");
      const top = page.getByRole("group", { name: "Подпись сверху", exact: true });
      const bottom = page.getByRole("group", { name: "Подпись снизу", exact: true });
      assert.equal(await top.getByRole("combobox").count(), 0);
      assert.equal(await bottom.getByRole("combobox").count(), 0);
      await top
        .getByRole("textbox", { name: "Подпись сверху: Текст подписи", exact: true })
        .fill("QR STUDIO");
      assert.equal(
        await bottom.getByRole("combobox").count(),
        0,
        "An empty caption has no formatting controls",
      );
      assert.equal(
        await top
          .getByRole("spinbutton", { name: "Межбуквенный интервал, пкс", exact: true })
          .isVisible(),
        false,
      );
      await top.locator("summary").click();
      await select(top, "Насыщенность шрифта", "Полужирная", page);
      await top
        .getByRole("spinbutton", { name: "Межбуквенный интервал, пкс", exact: true })
        .fill("0.5");
      await top.getByRole("textbox", { name: /^Подпись сверху/ }).fill("   ");
      assert.equal(await top.getByRole("combobox").count(), 0);
      assert.ok(!(await svgOf(page)).includes("<text"), "Whitespace-only drafts are not rendered");
      await top.getByRole("textbox", { name: /^Подпись сверху/ }).fill("QR STUDIO");
      await top.locator("summary").click();
      assert.equal(
        await top
          .getByRole("spinbutton", { name: "Межбуквенный интервал, пкс", exact: true })
          .inputValue(),
        "0.5",
      );
      assert.match(
        await top.getByRole("combobox", { name: "Насыщенность шрифта", exact: true }).innerText(),
        /Полужирная/,
      );
      await top.locator("summary").click();
      await bottom
        .getByRole("textbox", { name: "Подпись снизу: Текст подписи", exact: true })
        .fill("SCAN ME");
      await select(top, "Оформление подписи", "По дуге", page);
      await select(bottom, "Оформление подписи", "По дуге", page);
      await open(page, "Параметры QR-кода");
      await select(page, "Коррекция ошибок", "H — высокая");
      const resolution = page.getByRole("slider", { name: "Размер PNG", exact: true });
      await resolution.press("Home");
      await resolution.press("ArrowRight");
      await resolution.press("ArrowRight");
      assert.match(
        await page.getByLabel("Размер изображения", { exact: true }).innerText(),
        /^1024 × \d+ пкс$/,
      );
      await page.getByRole("spinbutton", { name: "Свободное поле, модули", exact: true }).fill("6");
      await previewOf(page).evaluate((image) => image.decode());
      const svgDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать SVG", exact: true }).click();
      const svg = await readFile(await (await svgDownload).path(), "utf8");
      assert.ok(
        svg.includes("<textPath") && svg.includes("<image") && svg.includes("stroke-dasharray"),
      );
      assert.ok(svg.includes("#1e40af"));
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
      const bytes = await readFile(await (await download).path());
      assert.equal(bytes.readUInt32BE(16), 1024);
      const decoded = await readBarcodes(bytes, {
        formats: ["QRCode"],
        tryHarder: true,
        textMode: "Plain",
      });
      assert.equal(decoded[0]?.text, payload);
      await page.getByRole("tab", { name: "Текст", exact: true }).click();
      await page.getByRole("textbox", { name: /^Текст/ }).fill("x".repeat(5000));
      await previewOf(page).waitFor({ state: "detached" });
      assert.equal(
        await page.getByRole("button", { name: "Скачать SVG", exact: true }).isDisabled(),
        true,
      );
      await page.getByRole("textbox", { name: /^Текст/ }).fill(payload);
      await previewOf(page).waitFor();
      await open(page, "Логотип");
      await file.setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await page.getByRole("alert").filter({ hasText: "SVG не поддерживается" }).first().waitFor();
      assert.equal(await previewOf(page).count(), 0);
      await page.getByRole("button", { name: "Удалить логотип", exact: true }).click();
      await previewOf(page).waitFor();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`edits static payloads and preserves drafts at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    await stubMapTiles(page);
    try {
      await page.goto(baseUrl);
      /* oxlint-disable no-await-in-loop -- Each draft must be entered and exported before changing tabs. */
      for (const [type, fields, expected] of [
        [
          "Почта",
          { "Почта": "me@example.com", "Тема письма": "Привет & QR" },
          "mailto:me@example.com?subject=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%26%20QR",
        ],
        ["Телефон", { "Номер телефона": "+7 (999) 123-45-67" }, "tel:+79991234567"],
        [
          "СМС",
          { "Номер телефона": "+79991234567", "Сообщение": "Привет" },
          "sms:+79991234567?body=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82",
        ],
        [
          "Wi-Fi",
          { "Имя сети (SSID)": "QR;Studio", "Пароль сети": "hello:qr" },
          "WIFI:T:WPA;S:QR\\;Studio;P:hello\\:qr;H:false;;",
        ],
        [
          "Визитка",
          { "Полное имя": "Анна QR", "Почта": "anna@example.com" },
          "BEGIN:VCARD\r\nVERSION:3.0\r\nN:;Анна QR;;;\r\nFN:Анна QR\r\nEMAIL:anna@example.com\r\nEND:VCARD",
        ],
        ["Местоположение", { Широта: "55.7558", Долгота: "37.6173" }, "geo:55.7558,37.6173"],
      ]) {
        await page.getByRole("tab", { name: type, exact: true }).click();
        await previewOf(page).waitFor();
        if (type === "Почта") await page.getByLabel("Сообщение", { exact: true }).fill("");
        if (type === "Визитка") {
          await page.getByLabel("Организация", { exact: true }).fill("");
          await page.getByLabel("Номер телефона", { exact: true }).fill("");
        }
        for (const [name, value] of Object.entries(fields)) {
          await page.getByLabel(name, { exact: true }).fill(value);
        }
        await previewOf(page).evaluate((image) => image.decode());
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
        const decoded = await readBarcodes(await readFile(await (await download).path()), {
          formats: ["QRCode"],
          tryHarder: true,
          textMode: "Plain",
        });
        assert.equal(decoded[0]?.text, expected);
      }
      /* oxlint-enable no-await-in-loop */
      await page.getByRole("textbox", { name: "Широта", exact: true }).fill("91");
      assert.equal(await previewOf(page).count(), 0);
      await page.getByRole("tab", { name: "Почта", exact: true }).click();
      assert.equal(
        await page.getByRole("textbox", { name: "Почта", exact: true }).inputValue(),
        "me@example.com",
      );
      await page.getByRole("tab", { name: "Wi-Fi", exact: true }).click();
      await select(page, "Тип защиты", "Без пароля");
      assert.equal(await page.getByLabel("Пароль сети", { exact: true }).count(), 0);
      await select(page, "Тип защиты", "WPA / WPA2 / WPA3");
      assert.equal(await page.getByLabel("Пароль сети", { exact: true }).inputValue(), "hello:qr");
      await open(page, "Форма и рамка");
      await settleLayout(page);
      const panel = page
        .getByRole("button", { name: "Форма и рамка", exact: true })
        .locator('xpath=ancestor::*[@data-slot="item"][1]');
      const content = panel.locator('[data-slot="content"]');
      const padding = await content.evaluate((element) => ({
        top: getComputedStyle(element).paddingTop,
        bottom: getComputedStyle(element).paddingBottom,
      }));
      assert.deepEqual(padding, { top: "0px", bottom: "0px" });
      const x = (await panel.boundingBox()).x;
      const panelWidth = (await panel.boundingBox()).width;
      await page.getByRole("button", { name: "Форма и рамка", exact: true }).click();
      await settleLayout(page);
      assert.ok((await content.boundingBox()) === null || (await content.boundingBox()).height < 1);
      assert.equal((await panel.boundingBox()).x, x);
      assert.equal((await panel.boundingBox()).width, panelWidth);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`validates fields and selects coordinates on OpenLayers at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await stubMapTiles(page);
    try {
      await page.goto(baseUrl);
      assert.equal(
        await page.locator(".ol-viewport").count(),
        0,
        "No map before selecting coordinates",
      );
      await page.getByRole("tab", { name: "Почта", exact: true }).click();
      await previewOf(page).waitFor();
      const email = page.getByLabel("Почта", { exact: true });
      await email.fill("bad");
      await email.blur();
      await page.getByText("Введите корректный email.", { exact: true }).waitFor();
      assert.equal(await previewOf(page).count(), 0);
      await email.fill("hello@example.com");
      await previewOf(page).waitFor();
      assert.equal(await page.getByText("Введите корректный email.", { exact: true }).count(), 0);
      await page.getByRole("tab", { name: "Местоположение", exact: true }).click();
      const map = page.getByRole("region", { name: "Выбор точки на карте", exact: true });
      await map.locator("canvas").waitFor();
      const devtools = await context.newCDPSession(page);
      const viewport = await devtools.send("Runtime.evaluate", {
        expression: "document.querySelector('.ol-viewport')",
      });
      const listeners = await devtools.send("DOMDebugger.getEventListeners", {
        objectId: viewport.result.objectId,
      });
      assert.ok(
        listeners.listeners.some((listener) => listener.type === "wheel" && listener.passive),
        "The map wheel listener is passive",
      );
      assert.ok(
        !listeners.listeners.some((listener) => listener.type === "wheel" && !listener.passive),
        "No blocking wheel handler remains",
      );
      await devtools.detach();
      await page.getByRole("button", { name: "Выбрать центр карты", exact: true }).waitFor();
      await map.getByRole("link", { name: "OpenStreetMap", exact: true }).waitFor();
      const latitude = page.getByLabel("Широта", { exact: true });
      const longitude = page.getByLabel("Долгота", { exact: true });
      assert.equal(await latitude.inputValue(), "55.7558");
      await map.click({ position: { x: 120, y: 90 } });
      await page.waitForFunction(
        () => document.querySelector('input[aria-label="Широта"]').value !== "55.7558",
      );
      assert.ok(
        Number(await latitude.inputValue()) > 55.7558,
        "Click above the center selects a more northern point",
      );
      await longitude.fill("37,6173");
      await page.getByRole("button", { name: "Выбрать центр карты", exact: true }).click();
      assert.equal(
        await longitude.inputValue(),
        "37.617300",
        "Manual input moves the actual map center",
      );
      const marker = map.getByRole("button", { name: "Выбранная точка", exact: true });
      await marker.waitFor();
      const oldLongitude = await longitude.inputValue();
      const markerBox = await marker.boundingBox();
      await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        markerBox.x + markerBox.width / 2 + 60,
        markerBox.y + markerBox.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.waitForFunction(
        (previous) => document.querySelector('input[aria-label="Долгота"]').value !== previous,
        oldLongitude,
      );
      assert.ok(
        Number(await longitude.inputValue()) > Number(oldLongitude),
        "Dragging the actual marker east updates coordinates",
      );
      await latitude.fill("91");
      await latitude.blur();
      await page.getByText("Широта должна быть от −90 до 90.", { exact: true }).waitFor();
      assert.equal(await previewOf(page).count(), 0);
      assert.equal(await marker.isVisible(), false);
      await latitude.fill("55.7");
      await longitude.fill("37.6");
      await previewOf(page).waitFor();
      await marker.waitFor();
      await page.getByRole("button", { name: "Приблизить карту", exact: true }).click();
      await map.focus();
      await map.press("ArrowRight");
      await page.getByRole("button", { name: "Выбрать центр карты", exact: true }).click();
      assert.ok(
        Number(await longitude.inputValue()) > 37.6,
        "Keyboard panning and center selection work",
      );
      const retainedLatitude = await latitude.inputValue();
      const retainedLongitude = await longitude.inputValue();
      await open(page, "Форма и рамка");
      await open(page, "Содержимое");
      assert.equal(await latitude.inputValue(), retainedLatitude);
      assert.equal(await longitude.inputValue(), retainedLongitude);
      assert.equal(await map.locator(".ol-viewport").count(), 1);
      await page.getByRole("tab", { name: "Текст", exact: true }).click();
      await page.locator(".ol-viewport").waitFor({ state: "detached" });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    } finally {
      await context.close();
    }
  });
}

it("keeps coordinate entry working when map tiles cannot load", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  let fail = true;
  let requests = 0;
  await page.route("https://tile.openstreetmap.org/**", async (route) => {
    requests++;
    if (fail) await route.abort();
    else {
      await route.fulfill({
        contentType: "image/png",
        headers: { "access-control-allow-origin": "*" },
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
          "base64",
        ),
      });
    }
  });
  try {
    await page.goto(baseUrl);
    assert.equal(requests, 0, "No tile requests before opening coordinates");
    await page.getByRole("tab", { name: "Местоположение", exact: true }).click();
    const failure = page.getByText("Карта недоступна. Местоположение можно указать вручную.", {
      exact: true,
    });
    await failure.waitFor();
    await page.getByLabel("Широта", { exact: true }).fill("60");
    await page.getByLabel("Долгота", { exact: true }).fill("40");
    await previewOf(page).waitFor();
    await page.waitForLoadState("networkidle");
    await failure.waitFor();
    fail = false;
    await page.getByRole("button", { name: "Загрузить карту ещё раз", exact: true }).click();
    await failure.waitFor({ state: "detached" });
    await page
      .getByRole("region", { name: "Выбор точки на карте", exact: true })
      .locator("canvas")
      .waitFor();
  } finally {
    await context.close();
  }
});

for (const width of [1280, 390]) {
  it(`searches locations only on submit and selects results at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    await stubMapTiles(page);
    const queries = [];
    await page.route("https://photon.komoot.io/**", async (route) => {
      const query = new URL(route.request().url()).searchParams.get("q");
      queries.push(query);
      if (query === "ошибка") {
        await route.fulfill({ status: 503 });
        return;
      }
      const features =
        query === "нет места"
          ? []
          : [
              {
                geometry: { type: "Point", coordinates: [30.31413, 59.93863] },
                properties: {
                  osm_id: 1,
                  osm_type: "N",
                  name: "Дворцовая площадь",
                  city: "Санкт-Петербург",
                  country: "Россия",
                },
              },
            ];
      await route.fulfill({ json: { features }, headers: { "access-control-allow-origin": "*" } });
    });
    try {
      await page.goto(baseUrl);
      await page.getByRole("tab", { name: "Местоположение", exact: true }).click();
      const input = page.getByRole("textbox", { name: "Найти место", exact: true });
      await input.fill("Дворцовая площадь");
      assert.deepEqual(queries, []);
      await input.press("Enter");
      const result = page.getByRole("button", {
        name: "Дворцовая площадь, Санкт-Петербург, Россия",
        exact: true,
      });
      await result.waitFor();
      await result.click();
      assert.equal(await page.getByLabel("Широта", { exact: true }).inputValue(), "59.938630");
      assert.equal(await page.getByLabel("Долгота", { exact: true }).inputValue(), "30.314130");
      await previewOf(page).waitFor();
      await input.fill("Дворцовая площадь");
      await input.press("Enter");
      await result.waitFor();
      assert.equal(queries.length, 1, "Repeat queries use the cache");
      await input.fill("нет места");
      await page.getByRole("button", { name: "Найти", exact: true }).click();
      await page
        .getByText("Ничего не найдено. Попробуйте уточнить название.", { exact: true })
        .waitFor();
      await input.fill("ошибка");
      await input.press("Enter");
      await page
        .getByText(
          "Поиск временно недоступен. Можно выбрать точку на карте или ввести координаты.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page.getByLabel("Широта", { exact: true }).inputValue(),
        "59.938630",
        "A failed search keeps the selected point",
      );
      await previewOf(page).waitFor();
      await input.fill("a");
      await input.press("Enter");
      await page.getByText("Введите от 2 до 200 символов.", { exact: true }).waitFor();
      assert.equal(queries.length, 3);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`changes editor capabilities without losing drafts or hidden design at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const readState = async () =>
      JSON.parse(await page.getByLabel("Test editor state", { exact: true }).textContent());
    try {
      await page.goto(`${baseUrl}tests/fixtures/config.html`);
      await previewOf(page).waitFor();
      await page.getByRole("textbox", { name: /^Ссылка/ }).fill("https://example.org/keep");
      await open(page, "Цвета");
      await page.getByRole("button", { name: "Цвет элементов #1e40af", exact: true }).click();
      await open(page, "Форма и рамка");
      await pick(page, "Форма элементов", "Зеркальные лепестки");
      await pick(page, "Форма рамок маркеров", "Круги");
      await open(page, "Параметры QR-кода");
      await select(page, "Коррекция ошибок", "H — высокая");
      await page.getByRole("spinbutton", { name: "Свободное поле, модули", exact: true }).fill("6");
      const previous = await readState();
      const initialSvg = await svgOf(page);
      const navigation = page.getByRole("navigation", { name: "Test configurations", exact: true });
      await navigation.getByRole("button", { name: "compact", exact: true }).click();
      assert.equal(await page.getByRole("tab").count(), 2);
      assert.deepEqual(
        await page.locator('[aria-label="Настройки QR"] [data-slot="trigger"]').allTextContents(),
        ["Содержимое", "Цвета", "Форма и рамка"],
      );
      await previewOf(page).waitFor();
      assert.deepEqual(
        await readState(),
        previous,
        "Changing visible capabilities does not change state",
      );
      assert.equal(await svgOf(page), initialSvg);
      assert.equal(
        await page.getByRole("button", { name: "Проверить считывание", exact: true }).count(),
        0,
      );
      await open(page, "Цвета");
      assert.equal(await page.getByRole("combobox").count(), 0);
      assert.equal(await page.getByText("Цвета углов", { exact: true }).count(), 0);
      await open(page, "Форма и рамка");
      assert.equal(await page.getByRole("radiogroup").count(), 1);
      assert.equal(await page.getByRole("radio").count(), 3);
      await pick(page, "Форма элементов", "Скруглённые");
      assert.deepEqual((await readState()).design.finder, previous.design.finder);
      assert.deepEqual((await readState()).encoding, previous.encoding);
      await navigation.getByRole("button", { name: "custom", exact: true }).click();
      await previewOf(page).waitFor();
      assert.equal((await readState()).contentType, "text");
      assert.equal((await readState()).url, "https://example.org/keep");
      assert.deepEqual(
        await page.locator('[aria-label="Настройки QR"] [data-slot="trigger"]').allTextContents(),
        ["Форма и рамка", "Параметры QR-кода", "Цвета"],
      );
      assert.equal(await page.getByRole("radio").count(), 1);
      assert.equal(await page.getByRole("radio", { name: "Лепестки", exact: true }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Скачать SVG", exact: true }).count(), 0);
      assert.equal(
        await page.getByRole("button", { name: "Рекомендации", exact: true }).count(),
        0,
      );
      await open(page, "Параметры QR-кода");
      assert.equal(await page.getByRole("combobox").count(), 0);
      const quietZone = page.getByRole("spinbutton", {
        name: "Свободное поле, модули",
        exact: true,
      });
      assert.equal(await quietZone.getAttribute("min"), "8");
      assert.equal(await quietZone.getAttribute("max"), "10");
      assert.equal(await quietZone.getAttribute("step"), "2");
      assert.equal(
        await quietZone.inputValue(),
        "6",
        "Changing the UI range does not rewrite stored values",
      );
      await quietZone.fill("8");
      await open(page, "Цвета");
      const palette = page.getByRole("group", { name: "Цвет элементов (HEX)", exact: true });
      assert.equal(await palette.getByRole("button").count(), 1);
      assert.equal(
        await palette.getByRole("button", { name: "Цвет элементов #112233", exact: true }).count(),
        1,
      );
      assert.equal(
        (
          await page.getByRole("button", { name: "Цвет элементов", exact: true }).textContent()
        ).trim(),
        "#1E40AF",
        "Changing a palette does not change the current color",
      );
      const slider = page.getByRole("slider", { name: "Размер PNG", exact: true });
      assert.equal(await slider.getAttribute("aria-valuemax"), "1");
      await slider.press("End");
      assert.equal((await readState()).design.size, 1536);
      await navigation.getByRole("button", { name: "full", exact: true }).click();
      assert.equal(
        (await readState()).contentType,
        "text",
        "Restoring capabilities does not reset the user's selected type",
      );
      await page.getByRole("tab", { name: "Ссылка", exact: true }).click();
      assert.equal(
        await page.getByRole("textbox", { name: /^Ссылка/ }).inputValue(),
        "https://example.org/keep",
      );
      assert.equal((await readState()).design.foreground, "#1e40af");
      assert.equal((await readState()).encoding.errorCorrectionLevel, "H");
      await navigation.getByRole("button", { name: "noMap", exact: true }).click();
      await previewOf(page).waitFor();
      assert.equal((await readState()).contentType, "location");
      assert.equal(await page.getByLabel("Широта", { exact: true }).inputValue(), "55.7558");
      assert.equal(await page.locator(".ol-viewport").count(), 0);
      assert.equal(
        await page.getByRole("textbox", { name: "Найти место", exact: true }).count(),
        0,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`chooses colors with Nuxt UI and validates HEX at ${width}px`, async () => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width === 390,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(baseUrl);
      await open(page, "Цвета");
      const trigger = page.getByRole("button", { name: "Цвет элементов", exact: true });
      await trigger.focus();
      await trigger.press("Enter");
      const picker = page.locator('[data-slot="root"][aria-label="Цвет элементов"]');
      await picker.waitFor();
      const panel = page.getByRole("dialog");
      await settleLayout(page);
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, "Picker fits the viewport");
      const previousPreview = await previewOf(page).getAttribute("src");
      const selector = picker.locator('[data-slot="selector"]');
      const colorArea = await selector.boundingBox();
      const hueTrack = await picker.locator('[data-slot="track"]').boundingBox();
      assert.ok(
        colorArea.width >= 150 && colorArea.height >= 150,
        "Color area has visible dimensions",
      );
      assert.ok(hueTrack.width >= 8 && hueTrack.height >= 150, "Hue track has visible dimensions");
      if (width === 390) await selector.tap({ position: { x: 100, y: 80 } });
      else await selector.click({ position: { x: 100, y: 80 } });
      await page.waitForFunction(
        (previous) => document.querySelector('img[alt="Предпросмотр QR-кода"]')?.src !== previous,
        previousPreview,
      );
      const hex = page.getByRole("textbox", { name: "Цвет элементов (HEX)", exact: true });
      const picked = await hex.inputValue();
      assert.match(picked, /^#[\da-f]{6}$/i);
      assert.ok((await svgOf(page)).toLowerCase().includes(picked.toLowerCase()));
      const validSvg = await svgOf(page);
      await hex.fill("#zzzzzz");
      assert.equal(await hex.getAttribute("aria-invalid"), "true");
      assert.equal(await svgOf(page), validSvg, "Invalid HEX never replaces the valid preview");
      await hex.fill("#123");
      assert.equal((await trigger.textContent()).trim(), "#112233");
      await hex.press("End");
      await hex.pressSequentially("456");
      assert.equal(await hex.inputValue(), "#123456");
      assert.ok((await svgOf(page)).includes("#123456"));
      await page.screenshot({ path: `test-results/editor-color-picker-${width}.png` });
      await hex.press("Escape");
      await panel.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
      await page.getByRole("button", { name: "Цвет элементов #1e40af", exact: true }).click();
      await trigger.click();
      assert.equal(await hex.inputValue(), "#1e40af");
      assert.equal(await page.locator('input[type="color"]').count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`keeps themed surfaces distinct and text readable at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const colors = (locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return { text: style.color, background: style.backgroundColor };
      });
    try {
      await page.goto(baseUrl);
      const originalSvg = await svgOf(page);
      const url = page.getByRole("textbox", { name: /^Ссылка/ });
      const png = page.getByRole("button", { name: "Скачать PNG", exact: true });
      const card = page.getByLabel("Предпросмотр", { exact: true });
      const body = page.locator("body");
      const lightInput = await colors(url);
      assert.ok(contrast(lightInput.text, lightInput.background) >= 4.5);
      assert.equal(lightInput.background, (await colors(card)).background);
      await page.getByRole("tab", { name: "Визитка", exact: true }).click();
      const contactFields = page.getByRole("textbox");
      assert.equal(await contactFields.count(), 4);
      /* oxlint-disable no-await-in-loop -- Verify each independently labelled contact field. */
      for (const field of await contactFields.all()) {
        const appearance = await colors(field);
        assert.equal(appearance.background, (await colors(card)).background);
        assert.ok(contrast(appearance.text, appearance.background) >= 7);
      }
      /* oxlint-enable no-await-in-loop */
      await settleLayout(page);
      await page.screenshot({
        path: `test-results/editor-blue-contact-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("tab", { name: "Ссылка", exact: true }).click();
      const action = await colors(png);
      assert.ok(contrast(action.text, action.background) >= 4.5);
      assert.notEqual((await colors(body)).background, (await colors(card)).background);
      await open(page, "Цвета");
      await settleLayout(page);
      await page.screenshot({ path: `test-results/editor-blue-${width}.png`, fullPage: true });
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await open(page, "Содержимое");
      const darkInput = await colors(url);
      const darkAction = await colors(png);
      assert.ok(contrast(darkInput.text, darkInput.background) >= 4.5);
      assert.ok(contrast(darkAction.text, darkAction.background) >= 4.5);
      assert.notEqual((await colors(body)).background, (await colors(card)).background);
      assert.equal(await svgOf(page), originalSvg, "Interface theme does not recolor the QR");
      await settleLayout(page);
      await page.screenshot({ path: `test-results/editor-blue-dark-${width}.png`, fullPage: true });
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`distinguishes selected options and toggles Wi-Fi password at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl);
      const wifiTab = page.getByRole("tab", { name: "Wi-Fi", exact: true });
      await wifiTab.click();
      const password = page.getByLabel("Пароль сети", { exact: true });
      const value = await password.inputValue();
      const original = await svgOf(page);
      assert.equal(await password.getAttribute("type"), "password");
      await page.getByRole("button", { name: "Показать пароль", exact: true }).click();
      assert.equal(await password.getAttribute("type"), "text");
      assert.equal(await password.inputValue(), value);
      assert.equal(await svgOf(page), original);
      const hide = page.getByRole("button", { name: "Скрыть пароль", exact: true });
      assert.equal(await hide.getAttribute("aria-pressed"), "true");
      await hide.press("Enter");
      assert.equal(await password.getAttribute("type"), "password");
      await page.getByRole("button", { name: "Показать пароль", exact: true }).click();
      await page.getByRole("tab", { name: "Текст", exact: true }).click();
      await wifiTab.click();
      assert.equal(
        await password.getAttribute("type"),
        "password",
        "Returning to Wi-Fi hides the password",
      );
      await page.getByRole("tab", { name: "Wi-Fi", exact: true, selected: true }).waitFor();
      await settleLayout(page);
      const tabBackground = await wifiTab.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      const security = page.getByRole("combobox", { name: "Тип защиты", exact: true });
      await security.click();
      const selected = page.getByRole("option", { name: "WPA / WPA2 / WPA3", exact: true });
      const selectedBackground = await selected.evaluate(
        (element) => getComputedStyle(element, "::before").backgroundColor,
      );

      assert.equal(
        selectedBackground,
        tabBackground,
        "Selected tabs and options share the same accent surface",
      );
      if (width === 1280) {
        const alternative = page.getByRole("option", { name: "WEP", exact: true });
        await alternative.hover();
        const hoverBackground = await alternative.evaluate(
          (element) => getComputedStyle(element, "::before").backgroundColor,
        );
        assert.notEqual(hoverBackground, selectedBackground, "Hover differs from selection");
      }
      await settleLayout(page);
      await page.screenshot({
        path: `test-results/editor-wifi-options-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("option", { name: "Без пароля", exact: true }).click();
      assert.equal(await password.count(), 0);
      assert.equal(
        await page.getByRole("button", { name: /Показать пароль|Скрыть пароль/ }).count(),
        0,
      );
      await security.click();
      await page.getByRole("option", { name: "WPA / WPA2 / WPA3", exact: true }).click();
      assert.equal(await password.inputValue(), value);
      assert.equal(await password.getAttribute("type"), "password");
      assert.equal(await svgOf(page), original);
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`scales QR within square and circular artwork at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl);
      await open(page, "Форма и рамка");
      const slider = page.getByRole("slider", { name: "Размер кода в композиции", exact: true });
      const svgWidth = async () => Number((await svgOf(page)).match(/viewBox="0 0 ([\d.]+)/)[1]);
      const initialWidth = await svgWidth();
      await slider.press("Home");
      const smallWidth = await svgWidth();
      assert.ok(smallWidth > initialWidth, "Smaller QR takes a smaller share of the canvas");
      assert.match(await previewOf(page).getAttribute("src"), /width%3D%22512%22/);
      await pick(page, "Форма композиции", "Круг");
      assert.equal(await slider.getAttribute("aria-valuenow"), "40");
      const smallCircle = await svgWidth();
      await slider.press("End");
      assert.ok((await svgWidth()) < smallCircle);
      const maximum = Number(await slider.getAttribute("aria-valuemax"));
      assert.ok(maximum > 100, "Allows enlargement beyond the full quiet-zone fit");
      assert.equal(Number(await slider.getAttribute("aria-valuenow")), maximum);
      await page
        .getByText("Масштаб больше 100% сокращает свободное поле", { exact: false })
        .waitFor();
      await select(page, "Рамка", "Сплошная");
      await slider.press("ArrowLeft");
      const canvasSize = (await svgOf(page)).match(/width="(\d+)"/)[1];
      assert.equal(canvasSize, "512");
      await open(page, "Цвета");
      await page
        .locator("summary")
        .filter({ hasText: /^Фон композиции$/ })
        .click();
      await page.getByRole("switch", { name: "Отдельный фон композиции", exact: true }).click();
      await page.getByRole("button", { name: "Цвет фона композиции", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Цвет фона композиции (HEX)", exact: true })
        .fill("#e2e8f0");
      await page.keyboard.press("Escape");
      await open(page, "Форма и рамка");
      assert.ok((await svgOf(page)).includes('clip-path="url(#qr-artwork-clip)"'));
      await settleLayout(page);
      await page.screenshot({
        path: `test-results/editor-scale-circle-${width}.png`,
        fullPage: true,
      });
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
      const bytes = await readFile(await (await download).path());
      assert.equal(bytes.readUInt32BE(16), 512);
      const decoded = await readBarcodes(bytes, {
        formats: ["QRCode"],
        tryHarder: true,
        textMode: "Plain",
      });
      assert.equal(decoded[0]?.text, "https://example.com");
      await page.getByRole("button", { name: "Компактный", exact: true }).click();
      assert.equal(await slider.count(), 0);
      await page.getByRole("button", { name: "Полный", exact: true }).click();
      await open(page, "Форма и рамка");
      assert.equal(Number(await slider.getAttribute("aria-valuenow")), maximum - 1);
      await pick(page, "Форма композиции", "Квадрат");
      const squareMaximum = Number(await slider.getAttribute("aria-valuemax"));
      assert.equal(
        Number(await slider.getAttribute("aria-valuenow")),
        Math.min(maximum - 1, squareMaximum),
      );
      await open(page, "Содержимое");
      const url = page.getByRole("textbox", { name: /^Ссылка/ });
      await url.fill("https://example.com/" + "dense-payload-".repeat(60));
      await previewOf(page).waitFor();
      await open(page, "Форма и рамка");
      assert.ok(Number(await slider.getAttribute("aria-valuemax")) < squareMaximum);
      assert.ok(Number(await slider.getAttribute("aria-valuenow")) > 100);
      await slider.press("Home");
      assert.equal(await slider.getAttribute("aria-valuenow"), "40");
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`prioritizes recommendations and explains PNG size at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}tests/fixtures/config.html?feedback`);
      const critical = page.getByRole("alert", {
        name: "Исправьте перед использованием",
        exact: true,
      });
      const recommendations = page.getByRole("region", { name: "Рекомендации", exact: true });
      await critical.waitFor();
      await previewOf(page).evaluate((image) => image.decode());
      await settleLayout(page);
      assert.ok(
        (await critical.boundingBox()).y < (await previewOf(page).boundingBox()).y,
        "Critical advice precedes the QR and export actions",
      );
      assert.match(await critical.innerText(), /не меньше 4 модулей/);
      assert.equal(await recommendations.getByRole("listitem").count(), 2);
      assert.equal(await recommendations.getByRole("button").count(), 0);
      const warning = recommendations.locator('[data-slot="root"][aria-label="Обратите внимание"]');
      const info = recommendations.locator('[data-slot="root"][aria-label="Проверьте оформление"]');
      const background = (locator) =>
        locator.evaluate((element) => getComputedStyle(element).backgroundColor);
      const criticalBackground = await background(critical);
      const warningBackground = await background(warning);
      const infoBackground = await background(info);
      assert.notEqual(criticalBackground, warningBackground);
      assert.notEqual(warningBackground, infoBackground);
      assert.notEqual(criticalBackground, "rgba(0, 0, 0, 0)");
      const appearances = await Promise.all(
        [critical, warning, info].map((notice) =>
          notice.evaluate((element) => {
            // Composite the translucent alert surface over the white card and normalize CSS colors.
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const paintContext = canvas.getContext("2d");
            paintContext.fillStyle = "#ffffff";
            paintContext.fillRect(0, 0, 1, 1);
            paintContext.fillStyle = getComputedStyle(element).backgroundColor;
            paintContext.fillRect(0, 0, 1, 1);
            const surface = `rgb(${[...paintContext.getImageData(0, 0, 1, 1).data].slice(0, 3).join(",")})`;
            const text = getComputedStyle(element.querySelector('[data-slot="description"]')).color;
            return { text, background: surface };
          }),
        ),
      );
      for (const appearance of appearances) {
        assert.ok(
          contrast(appearance.text, appearance.background) >= 4.5,
          "Alert text remains readable on its tinted surface",
        );
      }

      await page.screenshot({
        path: `test-results/editor-recommendations-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Пояснение: Размер PNG", exact: true }).click();
      const tooltip = page.getByRole("tooltip");
      await tooltip.waitFor();
      assert.match(await tooltip.innerText(), /Ширина скачиваемого PNG в пикселях/);
      assert.match(await tooltip.innerText(), /1024 пкс.*вдвое шире.*512 пкс/);
      assert.doesNotMatch(
        await tooltip.innerText(),
        /Масштаб предпросмотра|подходит для увеличения/,
      );
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "styling", exact: true }).click();
      assert.equal(await critical.count(), 0);
      assert.equal(
        await recommendations.getByRole("listitem").count(),
        1,
        "General styling notices remain combined into one visible message",
      );
      await page.getByRole("button", { name: "none", exact: true }).click();
      assert.equal(await recommendations.count(), 0);
      await page.getByRole("button", { name: "critical", exact: true }).click();
      await critical.waitFor();
      await page.getByRole("button", { name: "toggle recommendations", exact: true }).click();
      assert.equal(await critical.count(), 0);
      assert.equal(await recommendations.count(), 0);
      await previewOf(page).waitFor();
    } finally {
      await context.close();
    }
  });
}

for (const width of [1280, 390]) {
  it(`keeps a selected logo when switching content types at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    await stubMapTiles(page);
    try {
      await page.goto(baseUrl);
      await open(page, "Логотип");
      await pick(page, "Готовые логотипы", "Telegram");
      const logoSource = editorLogoPresets.find((item) => item.id === "telegram").dataUri;
      /* oxlint-disable no-await-in-loop -- Switch live drafts and decode each exported QR with the same logo. */
      for (const [type, expected] of [
        ["Ссылка", /^https:\/\/example\.com$/],
        ["Текст", /^QR Studio$/],
        ["Почта", /^mailto:hello@example\.com\?/],
        ["Телефон", /^tel:\+79991234567$/],
        ["СМС", /^sms:\+79991234567\?/],
        ["Wi-Fi", /^WIFI:T:WPA;S:QR Studio Guest;/],
        ["Визитка", /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/],
        ["Местоположение", /^geo:55\.7558,37\.6173$/],
      ]) {
        await page.getByRole("tab", { name: type, exact: true }).click();
        await previewOf(page).evaluate((image) => image.decode());
        const svg = await svgOf(page);
        assert.ok(svg.includes(logoSource), `${type} retains the selected logo`);
        assert.match(svg, /<image [^>]*width="4"/);
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
        const decoded = await readBarcodes(await readFile(await (await download).path()), {
          formats: ["QRCode"],
          tryHarder: true,
          textMode: "Plain",
        });
        assert.equal(decoded.length, 1);
        assert.match(decoded[0].text, expected);
      }
      /* oxlint-enable no-await-in-loop */
      await open(page, "Логотип");
      await page.getByRole("radio", { name: "Telegram", exact: true, checked: true }).waitFor();
    } finally {
      await context.close();
    }
  });

  it(`keeps preview and controls stable while replacing a logo at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = async function () {
          await decode.call(this);
          if (window.holdLogoDecode && this.src.startsWith("data:image/png")) {
            await new Promise((resolve) => {
              window.resumeLogoDecode = resolve;
            });
          }
        };
      });
      await page.goto(baseUrl);
      await open(page, "Логотип");
      await pick(page, "Готовые логотипы", "Telegram");
      await settleLayout(page);
      const size = page.getByRole("slider", { name: "Размер логотипа", exact: true });
      await settleLayout(page);
      const source = await previewOf(page).getAttribute("src");
      const measure = () =>
        page.evaluate(() => {
          const image = document.querySelector('img[alt="Предпросмотр QR-кода"]');
          const slider = document.querySelector('[role="slider"][aria-label="Размер логотипа"]');
          return {
            imageHeight: image.getBoundingClientRect().height,
            imageWidth: image.getBoundingClientRect().width,
            sliderY: slider.getBoundingClientRect().top + window.scrollY,
            pageHeight: document.documentElement.scrollHeight,
            recommendations: document.querySelectorAll('section[aria-label="Рекомендации"]').length,
          };
        });
      const initialLayout = await measure();
      assert.ok(initialLayout.recommendations > 0, "Exercise layout with recommendations");
      const image = await previewOf(page).elementHandle();
      const slider = await size.elementHandle();
      await page.evaluate(() => {
        window.holdLogoDecode = true;
      });
      const gallery = page.getByRole("radiogroup", { name: "Готовые логотипы", exact: true });
      await gallery
        .locator('[data-slot="item"]')
        .filter({
          has: page.getByRole("radio", { name: "WhatsApp", exact: true }),
        })
        .click({ force: true });
      await page.locator('[aria-busy="true"]').waitFor();
      assert.ok(await image.evaluate((element) => element.isConnected));
      assert.ok(await slider.evaluate((element) => element.isConnected));
      assert.equal(await previewOf(page).getAttribute("src"), source);
      assert.deepEqual(await measure(), initialLayout);
      assert.ok(await page.getByRole("button", { name: "Скачать SVG", exact: true }).isDisabled());
      assert.ok(await page.getByRole("button", { name: "Скачать PNG", exact: true }).isDisabled());
      assert.ok(
        await page.getByRole("button", { name: "Проверить считывание", exact: true }).isDisabled(),
      );
      await page.evaluate(() => window.resumeLogoDecode());
      await gallery.getByRole("radio", { name: "WhatsApp", exact: true, checked: true }).waitFor();
      assert.deepEqual(await measure(), initialLayout);
      assert.ok(await page.getByRole("button", { name: "Скачать SVG", exact: true }).isEnabled());
      assert.ok(
        (await svgOf(page)).includes(
          editorLogoPresets.find((item) => item.id === "whatsapp").dataUri,
        ),
      );
    } finally {
      await context.close();
    }
  });

  it(`chooses, uploads and exports local logo presets at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl);
      await open(page, "Логотип");
      await settleLayout(page);
      const gallery = page.getByRole("radiogroup", { name: "Готовые логотипы", exact: true });
      await gallery
        .getByRole("radio", { name: "Без логотипа", exact: true, checked: true })
        .waitFor();
      assert.equal(editorLogoPresets.length, 24);
      /* oxlint-disable no-await-in-loop -- Exercise real sequential user choices in each category. */
      for (const group of new Set(editorLogoPresets.map((item) => item.group))) {
        await page.getByRole("tab", { name: group, exact: true }).click();
        for (const preset of editorLogoPresets.filter((item) => item.group === group)) {
          await pick(page, "Готовые логотипы", preset.title);
          await previewOf(page).evaluate((image) => image.decode());
          assert.ok((await svgOf(page)).includes(preset.dataUri), `Embeds ${preset.title}`);
        }
      }
      /* oxlint-enable no-await-in-loop */
      await page.getByRole("tab", { name: "Соцсети и сервисы", exact: true }).click();
      await pick(page, "Готовые логотипы", "Без логотипа");
      await gallery
        .getByRole("radio", { name: "Без логотипа", exact: true })
        .press("ArrowRight", { delay: 50 });
      await gallery.getByRole("radio", { name: "Telegram", exact: true, checked: true }).waitFor();
      const size = page.getByRole("slider", { name: "Размер логотипа", exact: true });
      await size.press("ArrowLeft");
      assert.equal(await size.getAttribute("aria-valuenow"), "3.5");
      const clear = page.getByRole("switch", {
        name: "Очистить область под логотипом",
        exact: true,
      });
      await clear.click();
      await pick(page, "Готовые логотипы", "WhatsApp");
      assert.equal(await size.getAttribute("aria-valuenow"), "3.5");
      assert.equal(await clear.getAttribute("aria-checked"), "false");
      await clear.click();
      const selected = await svgOf(page);
      const svgDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать SVG", exact: true }).click();
      assert.equal(await readFile(await (await svgDownload).path(), "utf8"), selected);
      const pngDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
      const bytes = await readFile(await (await pngDownload).path());
      const decoded = await readBarcodes(bytes, {
        formats: ["QRCode"],
        tryHarder: true,
        textMode: "Plain",
      });
      assert.equal(decoded[0]?.text, "https://example.com");
      const customPng = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        const paint = canvas.getContext("2d");
        paint.fillStyle = "#173d51";
        paint.fillRect(0, 0, 24, 24);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await page.getByLabel("Файл логотипа", { exact: true }).setInputFiles({
        name: "own.png",
        mimeType: "image/png",
        buffer: Buffer.from(customPng, "base64"),
      });
      await page.getByRole("img", { name: "Свой логотип", exact: true }).waitFor();
      assert.equal(await gallery.getByRole("radio", { checked: true }).count(), 0);
      assert.equal(await size.getAttribute("aria-valuenow"), "3.5");
      await pick(page, "Готовые логотипы", "Telegram");
      assert.equal(await page.getByRole("img", { name: "Свой логотип", exact: true }).count(), 0);
      const withLogo = await svgOf(page);
      await page.getByRole("button", { name: "Компактный", exact: true }).click();
      assert.equal(await gallery.count(), 0);
      assert.equal(await svgOf(page), withLogo);
      await page.getByRole("button", { name: "Полный", exact: true }).click();
      await open(page, "Логотип");
      await gallery.getByRole("radio", { name: "Telegram", exact: true, checked: true }).waitFor();
      await settleLayout(page);
      await page.screenshot({
        path: `test-results/editor-logo-presets-${width}.png`,
        fullPage: true,
      });
      await pick(page, "Готовые логотипы", "Без логотипа");
      assert.ok(!(await svgOf(page)).includes("<image"));
      assert.equal(await size.count(), 0);
    } finally {
      await context.close();
    }
  });

  it(`supports a host logo catalog without upload and rejects invalid images at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const remoteRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("unavailable.invalid")) remoteRequests.push(request.url());
    });
    try {
      await page.goto(`${baseUrl}tests/fixtures/config.html`);
      await page.getByRole("button", { name: "logoOnly", exact: true }).click();
      const gallery = page.getByRole("radiogroup", { name: "Готовые логотипы", exact: true });
      await gallery.waitFor();
      assert.equal(await page.getByLabel("Файл логотипа", { exact: true }).count(), 0);
      assert.equal(await gallery.getByRole("radio").count(), 3);
      await pick(page, "Готовые логотипы", "WhatsApp");
      const embedded = await svgOf(page);
      await page.getByRole("button", { name: "withoutCatalog", exact: true }).click();
      assert.equal(await gallery.count(), 0);
      assert.equal(await svgOf(page), embedded, "Changing the catalog keeps the embedded image");
      await page.getByRole("button", { name: "badLogo", exact: true }).click();
      await gallery
        .locator('[data-slot="item"]')
        .filter({ has: page.getByRole("radio", { name: "Некорректный логотип", exact: true }) })
        .click();
      await page
        .getByText("Выберите PNG, JPEG или WebP. SVG не поддерживается.", { exact: true })
        .first()
        .waitFor();
      assert.equal(await previewOf(page).count(), 0);
      assert.ok(
        (await page
          .getByText("Выберите PNG, JPEG или WebP. SVG не поддерживается.", { exact: true })
          .count()) > 0,
      );
      assert.ok(await page.getByRole("button", { name: "Скачать PNG", exact: true }).isDisabled());
      await gallery
        .locator('[data-slot="item"]')
        .filter({ has: page.getByRole("radio", { name: "Повреждённый логотип", exact: true }) })
        .click();
      await page
        .getByText("Не удалось прочитать изображение. Выберите другой файл.", { exact: true })
        .first()
        .waitFor();
      assert.equal(await previewOf(page).count(), 0);
      assert.deepEqual(remoteRequests, []);
      await page.getByRole("button", { name: "logoOnly", exact: true }).click();
      await pick(page, "Готовые логотипы", "Telegram");
      await previewOf(page).waitFor();
      await pick(page, "Готовые логотипы", "Без логотипа");
      assert.ok(!(await svgOf(page)).includes("<image"));
    } finally {
      await context.close();
    }
  });
}
