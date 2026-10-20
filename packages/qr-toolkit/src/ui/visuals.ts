import { qrEditorRenderOptions } from "../editor/index.js";
import {
  encodeQr,
  renderQrSvg,
  type QrModuleShape,
  type RenderQrSvgOptions,
} from "../engine/index.js";

// A fixed sample keeps picker thumbnails stable when the user's content changes.
const sampleMatrix = encodeQr("https://example.com", { errorCorrectionLevel: "M" });
const thumbnailSize = 144;

export function qrDesignThumbnail(design: RenderQrSvgOptions): string | undefined {
  try {
    const svg = renderQrSvg(
      sampleMatrix,
      qrEditorRenderOptions({
        ...design,
        size: 512,
        quietZone: 4,
        logo: undefined,
      }),
    );
    return svgSource(svg);
  } catch {
    // Invalid host presets must not prevent the rest of the editor from mounting.
    return undefined;
  }
}

export function qrShapeThumbnail(
  kind: "modules" | "outer" | "inner" | "artwork",
  shape: QrModuleShape,
): string {
  const design: RenderQrSvgOptions = { size: thumbnailSize, foreground: "#202833" };
  let crop: string | undefined;
  if (kind === "modules") {
    design.moduleShape = shape;
    // Show data cells at a readable scale rather than an entire tiny QR symbol.
    crop = "12 12 9 9";
  } else if (kind === "outer") {
    design.finder = { outerShape: shape, innerColor: "#bbc0c8" };
    crop = "3.5 3.5 8 8";
  } else if (kind === "inner") {
    design.finder = { innerShape: shape };
    crop = "5.5 5.5 4 4";
  } else {
    design.shape = shape === "circle" ? "circle" : "square";
    design.frame = { color: "#202833", widthPx: 2 };
  }
  let svg = renderQrSvg(sampleMatrix, design);
  if (crop) svg = svg.replace(/viewBox="[^"]+"/, `viewBox="${crop}"`);
  return svgSource(svg);
}

function svgSource(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
