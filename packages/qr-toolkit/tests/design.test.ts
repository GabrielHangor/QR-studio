import { describe, expect, it } from "vitest";
import {
  QrError,
  analyzeQrDesign,
  encodeQr,
  renderQrSvg,
  type RenderQrSvgOptions,
} from "../src/engine/index.js";
import { playgroundPresets } from "../playground/presets.js";

describe("whole finder markers", () => {
  it.each(["square", "rounded", "circle"] as const)(
    "renders exactly three %s rings and pupils",
    (shape) => {
      const matrix = encodeQr("QR", { version: 2 });
      const finderOnly = {
        ...matrix,
        modules: matrix.modules.map((row, y) =>
          row.map(
            (dark, x) =>
              dark &&
              matrix.finderPatterns.some(
                (finder) => x >= finder.x && x < finder.x + 7 && y >= finder.y && y < finder.y + 7,
              ),
          ),
        ),
      };
      const before = JSON.stringify(finderOnly);
      const svg = renderQrSvg(finderOnly, {
        finder: {
          outerShape: shape,
          innerShape: "circle",
          outerColor: "#123456",
          innerColor: "#654321",
        },
      });
      expect(svg.match(/data-qr-finder="true"/g)).toHaveLength(3);
      expect(svg.match(/<path /g)).toHaveLength(6);
      expect(svg.match(/fill-rule="evenodd"/g)).toHaveLength(3);
      expect(svg.match(/fill="#123456"/g)).toHaveLength(3);
      expect(svg.match(/fill="#654321"/g)).toHaveLength(3);
      expect(JSON.stringify(finderOnly)).toBe(before);
    },
  );

  it("reports risky finder overrides independently of data-module colors", () => {
    const analysis = analyzeQrDesign(
      encodeQr("QR"),
      { finder: { outerColor: "#ffffff", innerColor: "#eeeeee", innerShape: "circle" } },
      { minimumContrastRatio: 4 },
    );
    expect(
      analysis.diagnostics.filter(({ code }) => code === "CONTRAST_BELOW_THRESHOLD"),
    ).toHaveLength(2);
    expect(analysis.diagnostics.some(({ code }) => code === "FOREGROUND_NOT_DARKER")).toBe(true);
    expect(
      analysis.diagnostics.some(({ code }) => code === "FINDER_SHAPE_REQUIRES_DEVICE_TEST"),
    ).toBe(true);
  });

  it.each([
    null,
    [],
    { outerShape: "star" },
    { innerShape: "star" },
    { outerColor: "red" },
    { innerColor: 'url("https://example.com")' },
  ])("rejects invalid finder options %j", (finder) => {
    const options = { finder } as unknown as RenderQrSvgOptions;
    expect(() => renderQrSvg(encodeQr("QR"), options)).toThrow(QrError);
    expect(() => analyzeQrDesign(encodeQr("QR"), options)).toThrow(QrError);
  });
});

describe("independent typography and framing", () => {
  it("preserves separate text styles in a serialized design", () => {
    const options: RenderQrSvgOptions = JSON.parse(
      JSON.stringify({
        caption: [
          {
            text: "BRAND",
            position: "top",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#123456",
          },
          {
            text: "Scan",
            position: "bottom",
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: 0.25,
            color: "#654321",
          },
        ],
      }),
    );
    const svg = renderQrSvg(encodeQr("QR"), options);
    const texts = [...svg.matchAll(/<text [^>]+>([^<]+)<\/text>/g)];
    expect(texts).toHaveLength(2);
    expect(texts[0]![0]).toContain('font-weight="700"');
    expect(texts[0]![0]).toContain('fill="#123456"');
    expect(texts[1]![0]).toContain('font-weight="400"');
    expect(texts[1]![0]).toContain('fill="#654321"');
    expect(Number(/letter-spacing="([\d.]+)"/.exec(texts[0]![0])![1])).toBeGreaterThan(
      Number(/letter-spacing="([\d.]+)"/.exec(texts[1]![0])![1]),
    );
  });

  it.each(["square", "circle"] as const)(
    "keeps a thick %s frame outside the protected QR square",
    (shape) => {
      const matrix = encodeQr("QR", { version: 2 });
      const size = 512;
      const svg = renderQrSvg(matrix, {
        shape,
        size,
        background: "#ffffff",
        artworkBackground: "#123456",
        frame: { color: "#abcdef", widthPx: 16 },
      });
      const extent = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
      const strokeWidth = Number(/stroke-width="([\d.]+)"/.exec(svg)![1]);
      const quietRect =
        /<rect x="([\d.]+)" y="([\d.]+)" width="33" height="33" fill="#ffffff"/.exec(svg)!;
      expect(quietRect).not.toBeNull();
      expect((strokeWidth * size) / extent).toBeCloseTo(16, 2);
      expect(svg).toContain('stroke="#abcdef"');
      const edgeToQuiet = Number(quietRect[1]);
      if (shape === "square") expect(edgeToQuiet).toBeGreaterThan(strokeWidth);
      else {
        const quietCornerRadius = Math.hypot(33 / 2, 33 / 2);
        expect(extent / 2 - strokeWidth).toBeGreaterThan(quietCornerRadius);
      }
    },
  );

  it("keeps top and bottom straight labels away from a thick square stroke", () => {
    const svg = renderQrSvg(encodeQr("QR"), {
      size: 512,
      frame: { widthPx: 16 },
      caption: [{ text: "Top", position: "top" }, { text: "Bottom" }],
    });
    const stroke = Number(/stroke-width="([\d.]+)"/.exec(svg)![1]);
    const height = Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)![1]);
    for (const match of svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]+font-size="([\d.]+)"/g)) {
      const y = Number(match[1]);
      const font = Number(match[2]);
      expect(y - font / 2).toBeGreaterThan(stroke);
      expect(y + font / 2).toBeLessThan(height - stroke);
    }
  });

  it.each([
    { frame: { widthPx: 0 } },
    { frame: { widthPx: Infinity } },
    { frame: { widthPx: 128 } },
    { frame: { style: "double" } },
    { frame: { color: "red" } },
    { artworkBackground: "transparent" },
    { caption: { text: "Scan", fontWeight: "bold" } },
    { caption: { text: "Scan", fontWeight: 100 } },
    { caption: { text: "Scan", letterSpacing: -1 } },
    { caption: { text: "Scan", letterSpacing: 11 } },
  ])("rejects unsupported style input %j", (options) => {
    const matrix = encodeQr("QR");
    expect(() => renderQrSvg(matrix, options as unknown as RenderQrSvgOptions)).toThrow();
    expect(() => analyzeQrDesign(matrix, options as unknown as RenderQrSvgOptions)).toThrow();
  });
});

describe("caller-owned preset data", () => {
  it.each(playgroundPresets)(
    "renders the external demo preset $id without changing it",
    (preset) => {
      const matrix = encodeQr("https://example.com");
      const serialized = JSON.stringify(preset.design);
      const design: RenderQrSvgOptions = JSON.parse(serialized);
      expect(renderQrSvg(matrix, design)).toContain("</svg>");
      const analysis = analyzeQrDesign(matrix, design, { minimumContrastRatio: 4 });
      expect(analysis.diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
      expect(analysis.diagnostics.some(({ code }) => code === "CONTRAST_BELOW_THRESHOLD")).toBe(
        false,
      );
      expect(JSON.stringify(preset.design)).toBe(serialized);
    },
  );
});

describe("matrix-wide gradients", () => {
  it.each(["horizontal", "vertical", "diagonal"] as const)(
    "uses a shared %s paint across all shapes and finders",
    (direction) => {
      const matrix = encodeQr("QR", { version: 1 });
      const svg = renderQrSvg(matrix, {
        moduleShape: "rounded",
        finder: { outerShape: "rounded", innerShape: "circle" },
        foreground: { type: "linear", direction, startColor: "#123456", endColor: "#456789" },
      });
      expect(svg.match(/<linearGradient /g)).toHaveLength(1);
      expect(svg).toContain('gradientUnits="userSpaceOnUse"');
      expect(svg).toContain('x1="4" y1="4"');
      expect(svg).toContain(
        `x2="${direction === "vertical" ? 4 : 25}" y2="${direction === "horizontal" ? 4 : 25}"`,
      );
      expect(svg.match(/fill="url\(#qr-foreground-gradient\)"/g)!.length).toBeGreaterThanOrEqual(7);
      expect(svg).not.toContain('x2="100%"');
    },
  );
});
