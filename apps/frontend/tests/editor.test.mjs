import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

let server;
let browser;
let baseUrl;
before(async () => {
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
