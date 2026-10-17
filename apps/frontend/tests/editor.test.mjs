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

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  describe(`QR editor at ${viewport.width}px`, () => {
    it("updates preview, retains drafts, removes stale QR and recovers", async () => {
      const context = await browser.newContext({ viewport, locale: "ru-RU", timezoneId: "UTC" });
      const externalRequests = [];
      const consoleErrors = [];
      await context.route("**/*", (route) => {
        const url = route.request().url();
        if (url.startsWith(baseUrl) || url.startsWith("data:")) return route.continue();
        externalRequests.push(url);
        return route.abort();
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      try {
        page.setDefaultTimeout(10_000);
        await page.goto(baseUrl);
        const preview = page.getByRole("img", { name: "Предпросмотр QR-кода" });
        const url = page.getByRole("textbox", { name: /^Ссылка/ });
        await url.waitFor();
        assert.equal(await preview.count(), 0);
        await url.fill("https://example.com/Привет?q=🙂");
        await preview.waitFor();
        await preview.evaluate((image) => image.decode());
        const original = await preview.getAttribute("src");
        await url.fill("https://");
        await url.blur();
        await preview.waitFor({ state: "detached" });
        await page
          .getByText("Укажите полный адрес сайта, начиная с https:// или http://.", { exact: true })
          .first()
          .waitFor();
        await url.fill("https://example.org");
        await preview.waitFor();
        assert.notEqual(await preview.getAttribute("src"), original);
        await page.getByRole("tab", { name: /^Текст/ }).click();
        const text = page.getByRole("textbox", { name: /^Текст/ });
        const payload = "  Привет 👋\nВторая строка  ";
        await text.fill(payload);
        await preview.waitFor();
        await page.getByRole("tab", { name: /^Ссылка/ }).click();
        assert.equal(await url.inputValue(), "https://example.org");
        await page.getByRole("tab", { name: /^Текст/ }).click();
        assert.equal(await text.inputValue(), payload);
        const beforeStyle = await preview.getAttribute("src");
        await page.getByRole("combobox", { name: "Форма модулей", exact: true }).click();
        await page.getByRole("option", { name: "Скруглённые", exact: true }).click();
        await page.waitForFunction(
          (previous) =>
            document.querySelector('img[alt="Предпросмотр QR-кода"]')?.getAttribute("src") !==
            previous,
          beforeStyle,
        );
        await preview.evaluate((image) => image.decode());
        await text.fill("x".repeat(5000));
        await preview.waitFor({ state: "detached" });
        await page.getByRole("alert").filter({ hasText: "Содержимое не помещается" }).waitFor();
        await text.fill("Recovered");
        await preview.waitFor();
        await text.fill("");
        await preview.waitFor({ state: "detached" });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        assert.deepEqual(externalRequests, []);
        assert.deepEqual(consoleErrors, []);
      } finally {
        await context.close();
      }
    });
  });
}

async function select(page, label, option, optionRoot = page) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await optionRoot.getByRole("option", { name: option, exact: true }).click();
}

for (const width of [1280, 390]) {
  it(`customizes and exports the full design at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "ru-RU" });
    const external = [];
    const errors = [];
    await context.route("**/*", (route) => {
      if (route.request().url().startsWith(baseUrl) || route.request().url().startsWith("data:")) {
        return route.continue();
      }
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(baseUrl);
      const preview = page.getByRole("img", { name: "Предпросмотр QR-кода" });
      await page.getByRole("textbox", { name: /^Ссылка/ }).fill("https://example.com/full-test");
      await preview.waitFor();
      let previous;
      /* oxlint-disable no-await-in-loop -- Preset changes share one page and must be sequential. */
      for (const title of [
        "Минимализм",
        "ATELIER — кофе",
        "Технологичный",
        "Яркий",
        "Строгий",
        "Брендовый знак",
      ]) {
        await select(page, "Готовый дизайн", title);
        await preview.evaluate((image) => image.decode());
        const source = await preview.getAttribute("src");
        assert.notEqual(source, previous);
        previous = source;
        assert.equal(
          await page.getByRole("textbox", { name: /^Ссылка/ }).inputValue(),
          "https://example.com/full-test",
        );
      }
      /* oxlint-enable no-await-in-loop */
      await select(page, "Готовый дизайн", "Технологичный");
      await page.getByRole("tab", { name: "Текст", exact: true }).click();
      const payload = "  Привет 👋\nQR Studio  ";
      await page.getByRole("textbox", { name: /^Текст/ }).fill(payload);
      await select(page, "Заливка модулей", "Слева направо");
      await page.getByRole("button", { name: "Общая форма и рамка", exact: true }).click();
      await select(page, "Общая форма", "Круги");
      await page.getByRole("switch", { name: "Отдельный внешний фон", exact: true }).click();
      await page.getByLabel("Цвет внешнего фона", { exact: true }).fill("#f1eadb");
      await page.getByRole("spinbutton", { name: "Толщина рамки, px", exact: true }).fill("4");
      await page.getByRole("button", { name: "Угловые маркеры", exact: true }).click();
      await select(page, "Внешняя форма маркеров", "Скруглённые");
      await select(page, "Форма центра маркеров", "Круги");
      await page.getByRole("switch", { name: "Свой цвет кольца", exact: true }).click();
      await page.getByLabel("Цвет кольца маркеров", { exact: true }).fill("#123456");
      await page.getByRole("button", { name: "Надписи вокруг QR", exact: true }).click();
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
      await select(top, "Насыщенность", "600", page);
      await page.getByRole("button", { name: "Логотип", exact: true }).click();
      const png = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#123456";
        ctx.fillRect(0, 0, 24, 24);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      const file = page.getByLabel("Логотип PNG, JPEG или WebP", { exact: true });
      await file.setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
      await page.getByRole("button", { name: "Убрать логотип", exact: true }).waitFor();
      await preview.waitFor();
      await page.getByRole("button", { name: "Параметры QR и экспорта", exact: true }).click();
      await select(page, "Коррекция ошибок", "H");
      await page.getByRole("spinbutton", { name: "Версия QR", exact: true }).fill("4");
      await select(page, "Ширина экспорта", "1024");
      await page.getByRole("spinbutton", { name: "Свободное поле, модули", exact: true }).fill("6");
      await preview.evaluate((image) => image.decode());
      const svgDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать SVG", exact: true }).click();
      const svgFile = await svgDownload;
      const svg = await readFile(await svgFile.path(), "utf8");
      assert.ok(svg.includes("<linearGradient"));
      assert.ok(svg.includes("<textPath"));
      assert.ok(svg.includes("<image"));
      assert.ok(svg.includes("#123456"));
      assert.ok(svg.includes('width="1024"'));
      const pngDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Скачать PNG", exact: true }).click();
      const pngFile = await pngDownload;
      const bytes = await readFile(await pngFile.path());
      assert.equal(bytes.readUInt32BE(16), 1024);
      const decoded = await readBarcodes(bytes, {
        formats: ["QRCode"],
        tryHarder: true,
        textMode: "Plain",
      });
      assert.equal(decoded[0]?.text, payload);
      await select(page, "Общая форма", "Квадраты");
      await preview.evaluate((image) => image.decode());
      assert.equal(
        decodeURIComponent((await preview.getAttribute("src")).split(",")[1]).includes("<textPath"),
        false,
      );
      await file.setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await page.getByRole("alert").filter({ hasText: "SVG не поддерживается" }).first().waitFor();
      assert.equal(
        await page.getByRole("button", { name: "Скачать PNG", exact: true }).isDisabled(),
        true,
      );
      assert.equal(await preview.count(), 0);
      await page.getByRole("button", { name: "Убрать логотип", exact: true }).click();
      await preview.waitFor();
      await select(page, "Пример содержимого", "Переполнение версии 1");
      await preview.waitFor({ state: "detached" });
      assert.equal(
        await page.getByRole("button", { name: "Скачать SVG", exact: true }).isDisabled(),
        true,
      );
      await select(page, "Пример содержимого", "Короткая ссылка");
      await preview.waitFor();
      await page.getByRole("button", { name: "Проверить считывание", exact: true }).click();
      await page
        .getByRole("status")
        .filter({ hasText: /браузер|Браузер|QR не распознан|содержимое не совпадает|Проверка/ })
        .first()
        .waitFor();
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
}
