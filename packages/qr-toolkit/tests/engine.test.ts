import decodeQR from "qr/decode.js";
import { describe, expect, it } from "vitest";

import { encodeQr, renderQrSvg } from "../src/engine/index.js";
import { QR_QUIET_ZONE_DEFAULT_MODULES } from "../src/engine/constants.js";
import type { ErrorCorrectionLevel, QrMatrix } from "../src/engine/index.js";

/** Keep module edges crisp for the decoder smoke test. */
const TEST_PIXELS_PER_MODULE = 4;

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

  it("accepts Unicode and keeps matrices independent of subsequent encodes", () => {
    const matrix = encodeQr("Привет, QR Studio! 👋");
    const before = JSON.stringify(matrix);
    expect(encodeQr("Another payload", { version: 10 }).modules).not.toEqual(matrix.modules);
    expect(JSON.stringify(matrix)).toBe(before);
  });

  it.each([1, 7, 40])("round-trips through the QR decoder at version %i", (version) => {
    const payload = "QR";

    for (const errorCorrectionLevel of ["L", "M", "Q", "H"] as const) {
      const matrix = encodeQr(payload, { version, errorCorrectionLevel });
      expect(decodeQR(matrixToImageData(matrix))).toBe(payload);
    }
  });
});

describe("SVG contract", () => {
  it("places modules by row and column, with a clear border", () => {
    const modules = Array.from({ length: 21 }, (_, y) =>
      Array.from({ length: 21 }, (_, x) => (y === 0 && x < 2) || (y === 1 && x === 3)),
    );
    const svg = renderQrSvg({ modules, size: 21, version: 1, errorCorrectionLevel: "M" });
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
});

describe("input boundaries", () => {
  it("rejects empty content and payloads that cannot fit", () => {
    expect(() => encodeQr("")).toThrow("non-empty");
    expect(() => encodeQr("a".repeat(5000))).toThrow();
    expect(() => encodeQr("a".repeat(100), { version: 1 })).toThrow();
  });

  it.each([0, 41, 1.5, NaN])("rejects invalid QR version %s", (version) => {
    expect(() => encodeQr("test", { version })).toThrow(RangeError);
  });

  it("rejects invalid ECC supplied by a JavaScript consumer", () => {
    expect(() => encodeQr("test", { errorCorrectionLevel: "X" as ErrorCorrectionLevel })).toThrow(
      RangeError,
    );
  });

  it.each([0, -1, 1.5, Infinity])("rejects invalid SVG size %s", (size) => {
    expect(() => renderQrSvg(encodeQr("test"), { size })).toThrow(RangeError);
  });

  it.each([0, 3, 4.5, Infinity, Number.MAX_SAFE_INTEGER])(
    "rejects unsafe quiet zone %s",
    (quietZone) => {
      expect(() => renderQrSvg(encodeQr("test"), { quietZone })).toThrow(RangeError);
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
    expect(() => renderQrSvg(matrix, { foreground: color })).toThrow(TypeError);
    expect(() => renderQrSvg(matrix, { background: color })).toThrow(TypeError);
  });

  it("rejects inconsistent matrix dimensions", () => {
    const matrix = encodeQr("test");
    expect(() => renderQrSvg({ ...matrix, size: matrix.size + 1 })).toThrow(TypeError);
    expect(() => renderQrSvg({ ...matrix, modules: matrix.modules.slice(1) })).toThrow(TypeError);
  });

  it("rejects malformed matrix metadata and rows", () => {
    const matrix = encodeQr("test");
    const malformedRows = [null, ...matrix.modules.slice(1)] as unknown as QrMatrix["modules"];

    expect(() =>
      renderQrSvg({ ...matrix, errorCorrectionLevel: "X" as ErrorCorrectionLevel }),
    ).toThrow(TypeError);
    expect(() => renderQrSvg({ ...matrix, modules: malformedRows })).toThrow(TypeError);
    expect(() => renderQrSvg(null as unknown as QrMatrix)).toThrow(TypeError);
  });
});
