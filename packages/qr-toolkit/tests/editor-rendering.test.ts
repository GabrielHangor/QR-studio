import { describe, expect, it } from "vitest";

import {
  analyzeQrDesign,
  encodeQr,
  renderQrSvg,
  type QrLogoOptions,
  type QrModuleShape,
} from "../src/engine/index.js";

const matrix = encodeQr("QR Studio", { version: 3, errorCorrectionLevel: "H" });
const logo: QrLogoOptions = {
  dataUri: "data:image/png;base64,AA==",
  widthModules: 3,
  paddingModules: 1,
};

describe("expanded editor rendering", () => {
  it("clears logo cells by default and can keep the QR under transparent image areas", () => {
    const original = renderQrSvg(matrix, { logo });
    const cleared = renderQrSvg(matrix, { logo: { ...logo, clearBackground: true } });
    const overlay = renderQrSvg(matrix, { logo: { ...logo, clearBackground: false } });
    expect(cleared).toBe(original);
    expect(cleared).toContain('data-qr-logo-clear="true"');
    expect(cleared).not.toContain("data-qr-logo-backing");
    expect(overlay).toContain('data-qr-logo-clear="false"');
    expect(overlay).toContain("<image");
    expect(
      analyzeQrDesign(matrix, { logo: { ...logo, clearBackground: false } }).logoCoveragePercent,
    ).toBeLessThan(analyzeQrDesign(matrix, { logo }).logoCoveragePercent!);
    expect(() =>
      renderQrSvg(matrix, { logo: { ...logo, clearBackground: "false" as unknown as boolean } }),
    ).toThrow("INVALID_LOGO_OPTIONS");
    expect(() =>
      renderQrSvg(matrix, { logo: { ...logo, widthModules: 25, clearBackground: false } }),
    ).toThrow("LOGO_OVERLAPS_FUNCTION_MODULES");
  });
  it("omits whole SVG cells in the clearance area without moving or mutating other cells", () => {
    const before = JSON.stringify(matrix);
    const design = { logo: { ...logo, widthModules: 3.5, paddingModules: 0.25 } };
    const cleared = renderQrSvg(matrix, design);
    const overlay = renderQrSvg(matrix, { logo: { ...design.logo, clearBackground: false } });
    const cells = (svg: string) => {
      const result = new Set<string>();
      for (const match of svg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
        const x = Number(match[1]) - 4;
        const y = Number(match[2]) - 4;
        for (let offset = 0; offset < Number(match[3]); offset++) result.add(`${x + offset},${y}`);
      }
      return result;
    };
    const clearedCells = cells(cleared);
    const overlayCells = cells(overlay);
    let removed = 0;
    for (let y = 0; y < matrix.size; y++) {
      for (let x = 0; x < matrix.size; x++) {
        const key = `${x},${y}`;
        expect(overlayCells.has(key)).toBe(matrix.modules[y]![x]);
        // This fractional logo intersects the central 5 × 5 cells of version 3.
        const inside = x >= 12 && x < 17 && y >= 12 && y < 17;
        expect(clearedCells.has(key)).toBe(matrix.modules[y]![x] && !inside);
        if (inside && matrix.modules[y]![x]) removed++;
      }
    }
    expect(removed).toBeGreaterThan(0);
    expect(clearedCells.size).toBe(overlayCells.size - removed);
    expect(JSON.stringify(matrix)).toBe(before);
    expect(analyzeQrDesign(matrix, design).logoCoveragePercent).toBeCloseTo((25 / 29 ** 2) * 100);
  });
  it("gives every new form distinct geometry without changing the encoded matrix", () => {
    const shapes: QrModuleShape[] = ["square", "rounded", "circle", "soft", "leaf", "leaf-reverse"];
    const before = JSON.stringify(matrix);
    const exports = shapes.map((moduleShape) =>
      renderQrSvg(matrix, { moduleShape, finder: { outerShape: moduleShape } }),
    );
    expect(new Set(exports).size).toBe(shapes.length);
    expect(JSON.stringify(matrix)).toBe(before);
    for (const moduleShape of shapes.slice(1)) {
      expect(
        analyzeQrDesign(matrix, { moduleShape }).diagnostics.some(
          (d) => d.code === "MODULE_SHAPE_REQUIRES_DEVICE_TEST",
        ),
      ).toBe(true);
    }
  });
  it("keeps frame spacing identical for solid and dashed outlines", () => {
    const solid = { frame: { style: "outline" as const, widthPx: 3 } };
    const dashed = { frame: { style: "dashed" as const, widthPx: 3 } };
    expect(analyzeQrDesign(matrix, dashed).modulePitchPx).toBe(
      analyzeQrDesign(matrix, solid).modulePitchPx,
    );
    expect(renderQrSvg(matrix, dashed)).toContain("stroke-dasharray=");
    expect(renderQrSvg(matrix, solid)).not.toContain("stroke-dasharray=");
  });
});
