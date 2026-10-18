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
  it("preserves the default logo backing and can reveal transparent image areas", () => {
    const original = renderQrSvg(matrix, { logo });
    const cleared = renderQrSvg(matrix, { logo: { ...logo, clearBackground: true } });
    const overlay = renderQrSvg(matrix, { logo: { ...logo, clearBackground: false } });
    expect(cleared).toBe(original);
    expect(cleared).toContain('data-qr-logo-backing="true"');
    expect(overlay).not.toContain('data-qr-logo-backing="true"');
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
