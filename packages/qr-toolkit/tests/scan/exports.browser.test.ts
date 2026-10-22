import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { server } from "vitest/browser";
import {
  prepareZXingModule,
  readBarcodes,
  ZXING_WASM_VERSION,
  ZXING_CPP_COMMIT,
  type ReaderOptions,
} from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

import { analyzeQrDesign, encodeQr, renderQrSvg } from "../../src/engine/index.js";
import { scanCases } from "./cases.js";
import { base64, canvas, encodeImage, logoDataUri, rasterizeSvg, scanImage } from "./images.js";

const directory = "test-results/scan";
const readerOptions: ReaderOptions = {
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  textMode: "Plain",
};
const results: Record<string, unknown>[] = [];

beforeAll(async () => {
  // No CDN: Vite serves the exact WASM binary installed by the lockfile.
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? wasmUrl : prefix + path,
    },
    fireImmediately: true,
  });
});

afterAll(async () => {
  await server.commands.writeFile(
    `${directory}/summary.json`,
    JSON.stringify(
      {
        browser: navigator.userAgent,
        decoder: { version: ZXING_WASM_VERSION, commit: ZXING_CPP_COMMIT },
        counts: {
          completed: results.length,
          passed: results.filter((result) => result.passed).length,
        },
        background: "white",
        readerOptions,
        results,
      },
      null,
      2,
    ),
  );
});

describe("real SVG/PNG exports decoded independently by ZXing", () => {
  test.each(scanCases)("$id", async (scenario) => {
    const design = scenario.logo
      ? {
          ...scenario.design,
          logo: { dataUri: logoDataUri(), widthModules: 5, paddingModules: 1 },
        }
      : scenario.design;
    const result: Record<string, unknown> = { ...scenario, design, passed: false };
    let svg: string | undefined;
    let png: Blob | undefined;
    let image: Blob | undefined;
    try {
      const start = performance.now();
      const matrix = encodeQr(scenario.payload, scenario.encoding);
      svg = renderQrSvg(matrix, design);
      result.engineMs = performance.now() - start;
      result.version = matrix.version;
      result.analysis = analyzeQrDesign(matrix, design);
      result.svgBytes = new Blob([svg]).size;
      const rasterStart = performance.now();
      const source = await rasterizeSvg(svg);
      expect(source.width).toBe(design.size ?? 512);
      const expectedCornerAlpha = design.shape === "circle" ? 0 : 255;
      const probes = [{ x: 0, y: 0, alpha: expectedCornerAlpha }];
      if (
        design.shape === "circle" &&
        (design.codeScale ?? 100) > 100 &&
        design.artworkBackground !== undefined &&
        design.artworkBackground !== design.background
      ) {
        const document = new DOMParser().parseFromString(svg, "image/svg+xml");
        const clipCircle = document.querySelector("#qr-artwork-clip circle")!;
        const analysis = analyzeQrDesign(matrix, design);
        const radius = Number(clipCircle.getAttribute("r"));
        const cy = Number(clipCircle.getAttribute("cy"));
        const halfBacking = (matrix.size + (design.quietZone ?? 4) * 2) / 2;
        const offset = Math.min(halfBacking, radius) - 0.25;
        const x = Math.round((radius - offset) * analysis.modulePitchPx);
        const y = Math.round((cy - offset) * analysis.modulePitchPx);
        // This point is inside the original square backing and outside the circular artwork.
        probes.push({ x, y, alpha: 0 });
      }
      for (const { x, y, alpha } of probes) {
        expect(source.getContext("2d")!.getImageData(x, y, 1, 1).data[3]).toBe(alpha);
      }
      png = await encodeImage(source);
      image = await scanImage(png, scenario.effect);
      result.rasterMs = performance.now() - rasterStart;
      result.width = source.width;
      result.height = source.height;
      const decodeStart = performance.now();
      const decoded = await readBarcodes(image, readerOptions);
      result.decodeMs = performance.now() - decodeStart;
      result.decoded = decoded.map(({ text, format }) => ({ text, format }));
      expect(decoded, `No QR found in ${scenario.id}`).toHaveLength(1);
      expect(decoded[0]!.text).toBe(scenario.payload);
      expect(decoded[0]!.format).toBe("QRCode");
      result.passed = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      const path = `${directory}/failures/${scenario.id}`;
      if (svg) await server.commands.writeFile(`${path}.svg`, svg);
      if (png) await server.commands.writeFile(`${path}.png`, await base64(png), "base64");
      if (image) {
        await server.commands.writeFile(
          `${path}.scan.${scenario.effect === "jpeg" ? "jpg" : "png"}`,
          await base64(image),
          "base64",
        );
      }
      await server.commands.writeFile(`${path}.json`, JSON.stringify(result, null, 2));
      throw error;
    } finally {
      results.push(result);
    }
  });

  test("negative control: blank image contains no QR", async () => {
    const context = canvas(256);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 256, 256);
    expect(await readBarcodes(await encodeImage(context.canvas), readerOptions)).toEqual([]);
  });
});
