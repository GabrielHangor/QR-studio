import { QrError } from "../src/engine/index.js";
import { describe, expect, it } from "vitest";
import {
  analyzeQrDesign,
  encodeQr,
  renderQrSvg,
  type RenderQrSvgOptions,
} from "../src/engine/index.js";

/** Inspect emitted geometry rather than testing the layout helper against itself. */
function viewBox(svg: string) {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
  return { width: Number(match[1]), height: Number(match[2]) };
}

describe("artwork geometry", () => {
  it.each([1, 7, 40])(
    "encloses the full quiet-zone square in a circle at version %i",
    (version) => {
      const matrix = encodeQr("QR", { version });
      const before = JSON.stringify(matrix);
      const svg = renderQrSvg(matrix, { shape: "circle", frame: "outline", quietZone: 6 });
      const { width, height } = viewBox(svg);
      const radius = Number(/<circle[^>]* r="([\d.]+)" fill="#ffffff"/.exec(svg)![1]);
      const origin = Number(/<path d="M([\d.]+)/.exec(svg)![1]);
      const centerToQuietCorner = Math.hypot(width / 2 - (origin - 6), height / 2 - (origin - 6));

      expect(width).toBe(height);
      expect(svg).toContain('width="512" height="512"');
      expect(centerToQuietCorner).toBeLessThan(radius - 0.9);
      expect(svg).not.toContain("<rect");
      expect(svg).not.toContain("clipPath");
      expect(JSON.stringify(matrix)).toBe(before);
      expect(renderQrSvg(matrix, { shape: "circle", frame: "outline", quietZone: 6 })).toBe(svg);
    },
  );

  it("places straight captions above and below the symbol without using its quiet zone", () => {
    const matrix = encodeQr("QR", { version: 1 });
    const svg = renderQrSvg(matrix, {
      size: 290,
      caption: [
        { text: "BRAND", position: "top", fontSize: 20 },
        { text: "Scan", position: "bottom", fontSize: 10, style: "banner", background: "#123456" },
      ],
    });
    expect(svg).toContain('width="290" height="344"');
    expect(svg).toContain('<g transform="translate(0 3.6)"><path d="M4 4');
    expect(svg).toContain('<text x="14.5" y="1.8"');
    expect(svg).toContain('<text x="14.5" y="33.5"');
    expect(svg).toContain('<rect x="0" y="32.6" width="29" height="1.8" fill="#123456"/>');
    expect(analyzeQrDesign(matrix, { size: 290 }).modulePitchPx).toBe(10);
  });

  it("fits two upright arcs into circular caps without shrinking the QR", () => {
    const matrix = encodeQr("QR", { version: 1 });
    const options: RenderQrSvgOptions = {
      shape: "circle",
      frame: "outline",
      caption: [
        { text: "QR STUDIO", position: "top", style: "arc", fontSize: 24 },
        { text: "Открыть меню", position: "bottom", style: "arc", fontSize: 24 },
      ],
    };
    const svg = renderQrSvg(matrix, options);
    const box = viewBox(svg);
    expect(box.width).toBe(box.height);
    expect(svg).toContain('width="512" height="512"');
    expect(svg).not.toContain("<rect");
    expect(svg).toContain('href="#qr-caption-top" startOffset="50%">QR STUDIO');
    expect(svg).toContain('href="#qr-caption-bottom" startOffset="50%">Открыть меню');
    const radii = [
      ...svg.matchAll(/id="qr-caption-(top|bottom)" d="[^"A]+A([\d.]+) [\d.]+ 0 0 (\d)/g),
    ];
    expect(radii).toHaveLength(2);
    expect(radii.map((match) => match[3])).toEqual(["1", "0"]);
    const uncaptioned = renderQrSvg(matrix, { shape: "circle", frame: "outline" });
    expect(viewBox(uncaptioned)).toEqual(box);
    expect(/<path d="[^"]+"/.exec(svg)![0]).toBe(/<path d="[^"]+"/.exec(uncaptioned)![0]);
    const analysis = analyzeQrDesign(matrix, options);
    expect(analysis.modulePitchPx).toBeCloseTo(512 / box.width, 4);
    expect(analysis.modulePitchPx).toBe(
      analyzeQrDesign(matrix, { shape: "circle", frame: "outline" }).modulePitchPx,
    );
  });

  it.each([256, 512, 1024])("keeps arc lettering outside the quiet zone at %i px", (size) => {
    for (const version of [1, 7, 40]) {
      const matrix = encodeQr("QR", { version });
      for (const frame of ["none", "outline"] as const) {
        for (const text of ["A", "ATELIER • COFFEE", "ШИРОКИЕ БУКВЫ 👋 ".repeat(5)]) {
          const options: RenderQrSvgOptions = {
            size,
            shape: "circle",
            frame,
            caption: [
              {
                text,
                position: "top",
                style: "arc",
                fontSize: 200,
                fontWeight: 700,
                letterSpacing: 10,
              },
              {
                text,
                position: "bottom",
                style: "arc",
                fontSize: 200,
                fontWeight: 600,
                letterSpacing: 4,
              },
            ],
          };
          const svg = renderQrSvg(matrix, options);
          const { width } = viewBox(svg);
          const radiusMatches = [
            ...svg.matchAll(/id="qr-caption-(?:top|bottom)" d="[^"A]+A([\d.]+)/g),
          ];
          const textMatches = [...svg.matchAll(/font-size="([\d.]+)"[^>]+textLength="([\d.]+)"/g)];
          expect(radiusMatches).toHaveLength(2);
          expect(textMatches).toHaveLength(2);
          for (const [index, match] of textMatches.entries()) {
            const fontSize = Number(match[1]);
            const textLength = Number(match[2]);
            const radius = Number(radiusMatches[index]![1]);
            const outerGlyphHeight = index === 0 ? 1.3 : 0.4;
            const innerGlyphHeight = index === 0 ? 0.4 : 1.3;
            // Include endpoint bearings, ascenders and descenders in the text envelope.
            const halfAngle = (textLength + fontSize) / (2 * radius);
            const innerY = (radius - innerGlyphHeight * fontSize) * Math.cos(halfAngle);
            expect(fontSize).toBeGreaterThan(0);
            expect(innerY).toBeGreaterThan((matrix.size + 8) / 2);
            expect(radius + outerGlyphHeight * fontSize).toBeLessThanOrEqual(width / 2 + 0.001);
            expect(fontSize * analyzeQrDesign(matrix, options).modulePitchPx).toBeLessThan(200);
          }
        }
      }
    }
  });

  it("keeps QR scale stable as arc text length and requested font size change", () => {
    const matrix = encodeQr("https://example.com");
    const baseOptions: RenderQrSvgOptions = { shape: "circle", frame: "outline", size: 512 };
    const baseSvg = renderQrSvg(matrix, baseOptions);
    const basePitch = analyzeQrDesign(matrix, baseOptions).modulePitchPx;
    for (const fontSize of [8, 18, 42, 200]) {
      const options = {
        ...baseOptions,
        caption: { text: "МАЛЕНЬКИЕ РИТУАЛЫ", style: "arc" as const, fontSize },
      };
      const svg = renderQrSvg(matrix, options);
      expect(viewBox(svg)).toEqual(viewBox(baseSvg));
      expect(/<path d="[^"]+"/.exec(svg)![0]).toBe(/<path d="[^"]+"/.exec(baseSvg)![0]);
      expect(analyzeQrDesign(matrix, options).modulePitchPx).toBe(basePitch);
    }
  });

  it("supports mixed straight and arc labels, with a centered logo", () => {
    const matrix = encodeQr("QR", { version: 2 });
    const svg = renderQrSvg(matrix, {
      shape: "circle",
      caption: [
        { text: "Brand", position: "top", fontSize: 24 },
        { text: "Scan", position: "bottom", style: "arc", fontSize: 16 },
      ],
      logo: { dataUri: "data:image/png;base64,aGVsbG8=", widthModules: 3 },
    });
    const box = viewBox(svg);
    const topHeight = box.height - box.width;
    const logoX = Number(/<image x="([\d.]+)"/.exec(svg)![1]);
    const circleY = Number(/<circle[^>]* cy="([\d.]+)"/.exec(svg)![1]);
    expect(circleY).toBeCloseTo(box.width / 2 + topHeight, 3);
    expect(logoX + 1.5).toBeCloseTo(box.width / 2, 3);
    expect(svg).toMatch(/<g transform="translate\(0 [\d.]+\)">.*<image/);
  });

  it.each(["plain", "banner", "arc"] as const)(
    "escapes Unicode text and fits long %s labels",
    (style) => {
      const matrix = encodeQr("QR");
      const options: RenderQrSvgOptions = { shape: "circle", caption: { text: "Бренд", style } };
      const shortSvg = renderQrSvg(matrix, options);
      const longSvg = renderQrSvg(matrix, {
        ...options,
        caption: { text: 'Бренд <&> "меню" 👋'.repeat(20), style },
      });
      const shortFont = Number(/font-size="([\d.]+)"/.exec(shortSvg)![1]);
      const longFont = Number(/font-size="([\d.]+)"/.exec(longSvg)![1]);
      expect(longFont).toBeGreaterThan(0);
      expect(longFont).toBeLessThan(shortFont);
      expect(longSvg).toContain("&lt;&amp;&gt; &quot;меню&quot; 👋");
    },
  );

  it.each([
    { shape: "triangle" },
    { caption: { text: " " } },
    { caption: { text: "Scan", position: "left" } },
    { caption: { text: "Scan", style: "arc" } },
    { caption: { text: "Scan", style: "unknown" } },
    { caption: [{ text: "A" }, { text: "B" }] },
    { caption: null },
    { caption: [null] },
    { caption: { text: "Scan", fontSize: 0 } },
    { caption: { text: "Scan", fontSize: Infinity } },
  ])("rejects invalid geometry options %j", (options) => {
    const matrix = encodeQr("QR");
    const invalid = options as unknown as RenderQrSvgOptions;
    expect(() => renderQrSvg(matrix, invalid)).toThrow();
    expect(() => analyzeQrDesign(matrix, invalid)).toThrow();
  });

  it("rejects arbitrary caption paints before they reach SVG", () => {
    expect(() =>
      renderQrSvg(encodeQr("QR"), { caption: { text: "Scan", color: 'red" onload="alert(1)' } }),
    ).toThrow(QrError);
  });
});
