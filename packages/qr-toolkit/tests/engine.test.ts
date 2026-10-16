import { QrError } from "../src/engine/index.js";
import decodeQR from "qr/decode.js";
import { describe, expect, it } from "vitest";

import { analyzeQrDesign, encodeQr, QrEncodingError, renderQrSvg } from "../src/engine/index.js";
import { QR_QUIET_ZONE_DEFAULT_MODULES } from "../src/engine/constants.js";
import type {
  ErrorCorrectionLevel,
  QrEncodingErrorCode,
  QrMatrix,
  QrModuleShape,
} from "../src/engine/index.js";

/** Keep module edges crisp for the decoder smoke test. */
const TEST_PIXELS_PER_MODULE = 4;

/** More pixels keep circular and rounded module edges visible to the test decoder. */
const STYLED_TEST_PIXELS_PER_MODULE = 8;

/** Match the renderer's circle radius when rasterizing styled modules for decode tests. */
const TEST_CIRCLE_MODULE_RADIUS = 0.44;

/** Match the renderer's rounded rectangle radius when rasterizing styled modules. */
const TEST_ROUNDED_MODULE_RADIUS = 0.2;

function matrixToImageData(matrix: QrMatrix) {
  const quietZone = QR_QUIET_ZONE_DEFAULT_MODULES;
  const width = (matrix.size + quietZone * 2) * TEST_PIXELS_PER_MODULE;
  const data = new Uint8Array(width * width * 4);

  for (let pixel = 0; pixel < data.length; pixel += 4) {
    data[pixel] = 255;
    data[pixel + 1] = 255;
    data[pixel + 2] = 255;
    data[pixel + 3] = 255;
  }

  for (let y = 0; y < matrix.size; y++) {
    const row = matrix.modules[y]!;
    for (let x = 0; x < matrix.size; x++) {
      if (!row[x]) continue;

      const pixelX = (x + quietZone) * TEST_PIXELS_PER_MODULE;
      const pixelY = (y + quietZone) * TEST_PIXELS_PER_MODULE;
      for (let offsetY = 0; offsetY < TEST_PIXELS_PER_MODULE; offsetY++) {
        for (let offsetX = 0; offsetX < TEST_PIXELS_PER_MODULE; offsetX++) {
          const offset = ((pixelY + offsetY) * width + pixelX + offsetX) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }
  }

  return { width, height: width, data };
}

function matrixToStyledImageData(
  matrix: QrMatrix,
  moduleShape: QrModuleShape,
  finderShape: QrModuleShape,
) {
  const quietZone = QR_QUIET_ZONE_DEFAULT_MODULES;
  const pixelsPerModule = STYLED_TEST_PIXELS_PER_MODULE;
  const width = (matrix.size + quietZone * 2) * pixelsPerModule;
  const data = new Uint8Array(width * width * 4);

  for (let pixel = 0; pixel < data.length; pixel += 4) {
    data[pixel] = 255;
    data[pixel + 1] = 255;
    data[pixel + 2] = 255;
    data[pixel + 3] = 255;
  }

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.modules[y]![x]) continue;

      const isFinderModule = matrix.finderPatterns.some(
        (pattern) => x >= pattern.x && x < pattern.x + 7 && y >= pattern.y && y < pattern.y + 7,
      );
      const shape = isFinderModule
        ? finderShape
        : matrix.functionModules[y]![x]
          ? "square"
          : moduleShape;

      for (let offsetY = 0; offsetY < pixelsPerModule; offsetY++) {
        for (let offsetX = 0; offsetX < pixelsPerModule; offsetX++) {
          if (!containsStyledPixel(shape, offsetX, offsetY, pixelsPerModule)) continue;

          const pixelX = (x + quietZone) * pixelsPerModule + offsetX;
          const pixelY = (y + quietZone) * pixelsPerModule + offsetY;
          const offset = (pixelY * width + pixelX) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }
  }

  return { width, height: width, data };
}

function containsStyledPixel(
  shape: QrModuleShape,
  x: number,
  y: number,
  pixelsPerModule: number,
): boolean {
  if (shape === "square") return true;

  const pixelCenterX = x + 0.5;
  const pixelCenterY = y + 0.5;
  if (shape === "circle") {
    const radius = TEST_CIRCLE_MODULE_RADIUS * pixelsPerModule;
    const distanceX = pixelCenterX - pixelsPerModule / 2;
    const distanceY = pixelCenterY - pixelsPerModule / 2;
    return distanceX ** 2 + distanceY ** 2 <= radius ** 2;
  }

  const radius = TEST_ROUNDED_MODULE_RADIUS * pixelsPerModule;
  const nearestX = Math.max(radius, Math.min(pixelsPerModule - radius, pixelCenterX));
  const nearestY = Math.max(radius, Math.min(pixelsPerModule - radius, pixelCenterY));
  return (pixelCenterX - nearestX) ** 2 + (pixelCenterY - nearestY) ** 2 <= radius ** 2;
}

function expectEncodingError(action: () => unknown, code: QrEncodingErrorCode) {
  let actualError: unknown;
  try {
    action();
  } catch (error) {
    actualError = error;
  }

  expect(actualError).toBeInstanceOf(QrEncodingError);
  expect((actualError as QrEncodingError).code).toBe(code);
}

describe("matrix contract", () => {
  it.each(["L", "M", "Q", "H"] as const)(
    "creates a borderless symbol at ECC %s",
    (errorCorrectionLevel) => {
      const matrix = encodeQr("https://example.com", { errorCorrectionLevel });
      expect(matrix.errorCorrectionLevel).toBe(errorCorrectionLevel);
      expect(matrix.size).toBe(matrix.version * 4 + 17);
      expect(matrix.modules.every((row) => row.length === matrix.size)).toBe(true);
      // The top-left finder starts immediately, with no encoder padding ring.
      expect(matrix.modules.slice(0, 7).map((row) => row.slice(0, 7).map(Number).join(""))).toEqual(
        ["1111111", "1000001", "1011101", "1011101", "1011101", "1000001", "1111111"],
      );
    },
  );

  it.each([1, 7, 20, 40])("honors explicit version %i", (version) => {
    const matrix = encodeQr("QR Studio", { version });
    expect(matrix.version).toBe(version);
    expect(matrix.size).toBe(version * 4 + 17);
  });

  it.each([1, 2, 7, 20, 40])("marks reserved function modules for version %i", (version) => {
    const matrix = encodeQr("QR", { version });
    expect(matrix.functionModules).toHaveLength(matrix.size);
    expect(matrix.functionModules.every((row) => row.length === matrix.size)).toBe(true);
    expect(matrix.functionModules[0]![0]).toBe(true);
    expect(matrix.functionModules[6]![8]).toBe(true);
    expect(matrix.finderPatterns).toEqual([
      { x: 0, y: 0 },
      { x: matrix.size - 7, y: 0 },
      { x: 0, y: matrix.size - 7 },
    ]);

    if (version >= 2) {
      expect(matrix.functionModules[matrix.size - 7]![matrix.size - 7]).toBe(true);
    }
    if (version >= 7) {
      expect(matrix.functionModules[0]![matrix.size - 11]).toBe(true);
    }
  });

  it("builds valid function masks for every supported version", () => {
    for (let version = 1; version <= 40; version++) {
      const matrix = encodeQr("QR", { version });
      expect(matrix.functionModules.flat()).toHaveLength(matrix.size ** 2);
      if (version >= 2) {
        expect(matrix.functionModules[matrix.size - 7]![matrix.size - 7]).toBe(true);
      }
    }
  });

  it("accepts Unicode and keeps matrices independent of subsequent encodes", () => {
    const payload = "Привет, QR Studio! 👋";
    const matrix = encodeQr(payload);
    const before = JSON.stringify(matrix);
    expect(encodeQr("Another payload", { version: 10 }).modules).not.toEqual(matrix.modules);
    expect(JSON.stringify(matrix)).toBe(before);
    expect(decodeQR(matrixToImageData(matrix))).toBe(payload);
  });

  it.each([1, 7, 40])("round-trips through the QR decoder at version %i", (version) => {
    const payload = "QR";

    for (const errorCorrectionLevel of ["L", "M", "Q", "H"] as const) {
      const matrix = encodeQr(payload, { version, errorCorrectionLevel });
      expect(decodeQR(matrixToImageData(matrix))).toBe(payload);
    }
  });

  it("round-trips rounded data modules and circular finder modules", () => {
    const payload = "QR";
    const matrix = encodeQr(payload, { version: 2 });
    const styledImage = matrixToStyledImageData(matrix, "rounded", "circle");

    expect(decodeQR(styledImage)).toBe(payload);
  });
});

describe("SVG contract", () => {
  it("places modules by row and column, with a clear border", () => {
    const modules = Array.from({ length: 21 }, (_, y) =>
      Array.from({ length: 21 }, (_, x) => (y === 0 && x < 2) || (y === 1 && x === 3)),
    );
    const matrix = { ...encodeQr("fixture", { version: 1 }), modules };
    const svg = renderQrSvg(matrix);
    expect(svg).toContain('viewBox="0 0 29 29"');
    expect(svg).toContain('<rect width="29" height="29" fill="#ffffff"/>');
    expect(svg).toContain('<path d="M4 4h2v1h-2zM7 5h1v1h-1z" fill="#000000"/>');
  });

  it("restyles one matrix without mutation and produces deterministic SVG", () => {
    const matrix = encodeQr("https://example.com");
    const before = JSON.stringify(matrix);
    const svg = renderQrSvg(matrix, {
      size: 740,
      quietZone: 6,
      foreground: "#123456",
      background: "#fff",
    });
    expect(svg).toContain('width="740" height="740"');
    expect(svg).toContain(`viewBox="0 0 ${matrix.size + 12} ${matrix.size + 12}"`);
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toContain("https://example.com");
    expect(JSON.stringify(matrix)).toBe(before);
    expect(renderQrSvg(matrix)).toBe(renderQrSvg(matrix));
  });

  it("supports data-module and finder-pattern shapes independently", () => {
    const svg = renderQrSvg(encodeQr("shape test"), {
      moduleShape: "circle",
      finderShape: "rounded",
    });

    expect(svg).toContain("<circle cx=");
    expect(svg).toContain('rx="0.2"');
    // Timing and other function modules remain square.
    expect(svg).toContain("<path d=");
  });

  it("supports a bounded linear gradient, logo, caption, and outline frame", () => {
    const matrix = encodeQr("design test", { version: 2 });
    const svg = renderQrSvg(matrix, {
      foreground: {
        type: "linear",
        direction: "diagonal",
        startColor: "#123456",
        endColor: "#abcdef",
      },
      logo: {
        dataUri: "data:image/png;base64,aGVsbG8=",
        widthModules: 4,
      },
      caption: {
        text: 'Scan <me> & "now"',
        style: "banner",
        color: "#111111",
        background: "#eeeeee",
      },
      frame: "outline",
    });

    expect(svg).toContain('<linearGradient id="qr-foreground-gradient"');
    expect(svg).toContain('href="data:image/png;base64,aGVsbG8="');
    expect(svg).toContain("Scan &lt;me&gt; &amp; &quot;now&quot;");
    expect(svg).toContain('stroke="url(#qr-foreground-gradient)"');
    expect(svg).toMatch(/height="\d+\.\d+"/);
  });

  it("rejects a logo knockout that reaches function modules", () => {
    const matrix = encodeQr("logo", { version: 1 });
    expect(() =>
      renderQrSvg(matrix, {
        logo: {
          dataUri: "data:image/png;base64,aGVsbG8=",
          widthModules: 6,
          paddingModules: 0.5,
        },
      }),
    ).toThrow(expect.objectContaining({ code: "LOGO_OVERLAPS_FUNCTION_MODULES" }));
  });
});

describe("design diagnostics", () => {
  it("warns when module shapes depart from square geometry", () => {
    const analysis = analyzeQrDesign(encodeQr("shape"), {
      moduleShape: "rounded",
      finderShape: "circle",
    });

    expect(analysis.diagnostics.map(({ code }) => code)).toEqual([
      "MODULE_SHAPE_REQUIRES_DEVICE_TEST",
      "FINDER_SHAPE_REQUIRES_DEVICE_TEST",
    ]);
  });

  it("reports contrast without imposing an unverified threshold", () => {
    const matrix = encodeQr("contrast");
    const analysis = analyzeQrDesign(matrix, {
      foreground: "#777777",
      background: "#ffffff",
    });

    expect(analysis.contrastRatio).toBeCloseTo(4.48, 2);
    expect(analysis.diagnostics).toEqual([]);
  });

  it("uses a caller-supplied contrast threshold and reports a short quiet zone", () => {
    const analysis = analyzeQrDesign(
      encodeQr("contrast"),
      { foreground: "#777777", quietZone: 3 },
      { minimumContrastRatio: 4.5 },
    );

    expect(analysis.diagnostics.map(({ code }) => code)).toEqual([
      "QUIET_ZONE_TOO_SMALL",
      "CONTRAST_BELOW_THRESHOLD",
    ]);
  });

  it("measures matrix density and warns only against a supplied module-size threshold", () => {
    const analysis = analyzeQrDesign(
      encodeQr("QR", { version: 40 }),
      { size: 512 },
      { minimumModulePitchPx: 3 },
    );

    expect(analysis.modulePitchPx).toBeCloseTo(512 / (177 + 8), 4);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ code: "MODULE_PITCH_BELOW_THRESHOLD", severity: "warning" }),
    ]);
  });

  it("reports gradient uncertainty and logo area without promising scannability", () => {
    const analysis = analyzeQrDesign(encodeQr("logo", { version: 1 }), {
      foreground: {
        type: "linear",
        direction: "horizontal",
        startColor: "#000000",
        endColor: "#777777",
      },
      logo: {
        dataUri: "data:image/png;base64,aGVsbG8=",
        widthModules: 6,
        paddingModules: 0.5,
      },
    });

    expect(analysis.contrastRatio).toBeNull();
    expect(analysis.logoCoveragePercent).toBeGreaterThan(0);
    expect(analysis.diagnostics.map(({ code }) => code)).toEqual([
      "GRADIENT_REQUIRES_DEVICE_TEST",
      "LOGO_REDUCES_ERROR_CORRECTION",
      "LOGO_OVERLAPS_FUNCTION_MODULES",
    ]);
  });
});

describe("input boundaries", () => {
  it("rejects empty content and payloads that cannot fit", () => {
    expectEncodingError(() => encodeQr(""), "EMPTY_PAYLOAD");
    expectEncodingError(() => encodeQr("a".repeat(5000)), "CAPACITY_EXCEEDED");
    expectEncodingError(() => encodeQr("a".repeat(100), { version: 1 }), "CAPACITY_EXCEEDED");
  });

  it.each([0, 41, 1.5, NaN])("rejects invalid QR version %s", (version) => {
    expectEncodingError(() => encodeQr("test", { version }), "INVALID_VERSION");
  });

  it("rejects invalid ECC supplied by a JavaScript consumer", () => {
    expectEncodingError(
      () => encodeQr("test", { errorCorrectionLevel: "X" as ErrorCorrectionLevel }),
      "INVALID_ERROR_CORRECTION_LEVEL",
    );
  });

  it.each([0, -1, 1.5, Infinity])("rejects invalid SVG size %s", (size) => {
    expect(() => renderQrSvg(encodeQr("test"), { size })).toThrow(QrError);
  });

  it.each([0, 3, 4.5, Infinity, Number.MAX_SAFE_INTEGER])(
    "rejects unsafe quiet zone %s",
    (quietZone) => {
      expect(() => renderQrSvg(encodeQr("test"), { quietZone })).toThrow(QrError);
    },
  );

  it.each([
    "red",
    "transparent",
    "#ffffff00",
    '#fff" onload="alert(1)',
    "url(https://example.com)",
  ])("rejects unsupported SVG paint %s", (color) => {
    const matrix = encodeQr("test");
    expect(() => renderQrSvg(matrix, { foreground: color })).toThrow(QrError);
    expect(() => renderQrSvg(matrix, { background: color })).toThrow(QrError);
  });

  it("rejects inconsistent matrix dimensions", () => {
    const matrix = encodeQr("test");
    expect(() => renderQrSvg({ ...matrix, size: matrix.size + 1 })).toThrow(QrError);
    expect(() => renderQrSvg({ ...matrix, modules: matrix.modules.slice(1) })).toThrow(QrError);
  });

  it("rejects malformed matrix metadata and rows", () => {
    const matrix = encodeQr("test");
    const malformedRows = [null, ...matrix.modules.slice(1)] as unknown as QrMatrix["modules"];
    const missingFunctionModules = matrix.functionModules.map((row) => row.map(() => false));

    expect(() =>
      renderQrSvg({ ...matrix, errorCorrectionLevel: "X" as ErrorCorrectionLevel }),
    ).toThrow(QrError);
    expect(() => renderQrSvg({ ...matrix, modules: malformedRows })).toThrow(QrError);
    expect(() => renderQrSvg({ ...matrix, functionModules: missingFunctionModules })).toThrow(
      QrError,
    );
    expect(() => renderQrSvg(null as unknown as QrMatrix)).toThrow(QrError);
  });
});
