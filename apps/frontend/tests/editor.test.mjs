import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

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
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(baseUrl);
        const preview = previewOf(page);
        await preview.waitFor();
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
        await open(page, "Формы и рамка");
        await pick(page, "Форма точек", "Мягкие");
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
    try {
      await page.goto(baseUrl);
      await previewOf(page).waitFor();
      await open(page, "Что будет в QR-коде");
      const closedHeight = await page
        .getByRole("button", { name: "Логотип", exact: true })
        .evaluate((button) => button.closest('[data-slot="item"]').getBoundingClientRect().height);
      assert.ok(closedHeight < 70, "Collapsed panels should not retain body padding");
      const tabs = await page.locator('[aria-label="Тип содержимого"]').boundingBox();
      const content = await page
        .getByRole("button", { name: "Что будет в QR-коде", exact: true })
        .boundingBox();
      assert.ok(tabs.y < content.y);
      if (width >= 1024) {
        const preview = await page
          .getByRole("heading", { name: "Предпросмотр", exact: true })
          .boundingBox();
        assert.ok(content.x < preview.x && Math.abs(content.y - preview.y) < 25);
      }
      await open(page, "Готовый дизайн");
      assert.equal(
        await page
          .getByRole("radiogroup", { name: "Готовый дизайн", exact: true })
          .getByRole("radio")
          .count(),
        16,
      );
      assert.equal(await page.getByText(/ATELIER|COFFEE/).count(), 0);
      await pick(page, "Готовый дизайн", "Вариант 7");
      if (width === 1920 || width === 390) {
        await page
          .getByRole("heading", { name: "QR Studio", exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/editor-${width}.png` });
      }
      await open(page, "Цвета");
      await page.getByRole("button", { name: "Цвет QR #1e40af", exact: true }).click();
      assert.equal(await page.getByLabel("Цвет QR", { exact: true }).inputValue(), "#1e40af");
      await open(page, "Формы и рамка");
      const group = page.getByRole("radiogroup", { name: "Форма точек", exact: true });
      assert.equal(await group.getByRole("radio").count(), 6);
      const selected = group.getByRole("radio", { checked: true });
      await selected.focus();
      await selected.press("ArrowRight", { delay: 50 });
      await group.getByRole("radio", { name: "Круги", exact: true, checked: true }).waitFor();
      if (width === 1920) await page.screenshot({ path: "test-results/editor-shapes-1920.png" });
      await open(page, "QR-код и файл");
      const help = page.getByRole("button", {
        name: "Пояснение: Поля вокруг QR, ячейки",
        exact: true,
      });
      if (width < 1024) await help.tap();
      else await help.focus();
      await page.getByRole("tooltip").waitFor();
      assert.match(await page.getByRole("tooltip").innerText(), /Минимум — 4 ячейки/);
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
      await open(page, "Готовый дизайн");
      /* oxlint-disable no-await-in-loop -- One page models sequential user choices. */
      for (let index = 1; index <= 16; index++) {
        await pick(page, "Готовый дизайн", `Вариант ${index}`);
        await previewOf(page).evaluate((image) => image.decode());
      }
      /* oxlint-enable no-await-in-loop */
      await pick(page, "Готовый дизайн", "Вариант 7");
      await open(page, "Что будет в QR-коде");
      assert.equal(await page.getByRole("textbox", { name: /^Текст/ }).inputValue(), payload);
      await open(page, "Цвета");
      await select(page, "Цвет или градиент", "Слева направо");
      await page.getByRole("button", { name: "Цвет QR #1e40af", exact: true }).click();
      await page.getByRole("switch", { name: "Свой цвет контура", exact: true }).click();
      await page.getByLabel("Цвет контура", { exact: true }).fill("#123456");
      await open(page, "Формы и рамка");
      await pick(page, "Форма точек", "Лепестки ↗");
      await pick(page, "Форма контура", "Мягкие");
      await pick(page, "Форма центра", "Лепестки");
      await pick(page, "Форма композиции", "Круг");
      await select(page, "Рамка", "Пунктирная");
      await page.getByRole("spinbutton", { name: "Толщина рамки, px", exact: true }).fill("3");
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
      const file = page.getByLabel("Логотип PNG, JPEG или WebP", { exact: true });
      await file.setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
      await previewOf(page).waitFor();
      const clear = page.getByRole("switch", { name: "Убрать код под логотипом", exact: true });
      await clear.waitFor();
      assert.equal(await clear.isChecked(), true);
      assert.ok((await svgOf(page)).includes('data-qr-logo-backing="true"'));
      await clear.click();
      await page.waitForFunction(
        () =>
          !decodeURIComponent(
            document.querySelector('img[alt="Предпросмотр QR-кода"]').src,
          ).includes('data-qr-logo-backing="true"'),
      );
      await clear.click();
      await open(page, "Надписи вокруг QR");
      const top = page.getByRole("group", { name: "Верхняя надпись", exact: true });
      const bottom = page.getByRole("group", { name: "Нижняя надпись", exact: true });
      await top
        .getByRole("textbox", { name: "Верхняя надпись: Текст надписи", exact: true })
        .fill("QR STUDIO");
      await bottom
        .getByRole("textbox", { name: "Нижняя надпись: Текст надписи", exact: true })
        .fill("SCAN ME");
      await select(top, "Стиль надписи", "По дуге круга", page);
      await select(bottom, "Стиль надписи", "По дуге круга", page);
      await open(page, "QR-код и файл");
      await select(page, "Устойчивость к повреждениям", "H — высокая");
      await page
        .getByRole("spinbutton", { name: "Плотность кода (версия)", exact: true })
        .fill("4");
      await select(page, "Ширина файла, px", "1024");
      await page.getByRole("spinbutton", { name: "Поля вокруг QR, ячейки", exact: true }).fill("6");
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
      await page
        .getByRole("spinbutton", { name: "Плотность кода (версия)", exact: true })
        .fill("1");
      await previewOf(page).waitFor({ state: "detached" });
      assert.equal(
        await page.getByRole("button", { name: "Скачать SVG", exact: true }).isDisabled(),
        true,
      );
      await page
        .getByRole("spinbutton", { name: "Плотность кода (версия)", exact: true })
        .fill("4");
      await previewOf(page).waitFor();
      await open(page, "Логотип");
      await file.setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await page.getByRole("alert").filter({ hasText: "SVG не поддерживается" }).first().waitFor();
      assert.equal(await previewOf(page).count(), 0);
      await page.getByRole("button", { name: "Убрать логотип", exact: true }).click();
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
