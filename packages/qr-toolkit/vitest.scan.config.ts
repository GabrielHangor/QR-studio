import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: { include: ["valibot"] },
  test: {
    name: "scan",
    include: ["tests/scan/*.browser.test.ts"],
    // Only this local test server may write generated reports and failure fixtures.
    api: { host: "127.0.0.1", allowWrite: true },
    globalSetup: ["./tests/scan/global-setup.ts"],
    reporters: ["default", "json"],
    outputFile: { json: "test-results/scan/vitest.json" },
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright({
        contextOptions: { locale: "en-US", timezoneId: "UTC", deviceScaleFactor: 1 },
      }),
      instances: [{ browser: "chromium", viewport: { width: 1280, height: 960 } }],
    },
  },
});
