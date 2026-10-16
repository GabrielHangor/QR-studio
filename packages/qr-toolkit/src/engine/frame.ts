import { QrError } from "./errors.js";
import type { RenderQrSvgOptions } from "./types.js";

/** New frame objects use an actual pixel stroke instead of the legacy module stroke. */
const DEFAULT_FRAME_WIDTH_PX = 2;

/** Bound the stroke so it leaves room for the QR and its protected quiet zone. */
const MAX_FRAME_WIDTH_FRACTION = 0.25;

const OPAQUE_HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

export function normalizeQrFrame(frame: RenderQrSvgOptions["frame"], outputSize: number) {
  if (frame === undefined || frame === "none" || frame === "outline") {
    return { style: frame ?? "none", color: undefined, widthPx: undefined };
  }
  if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
    throw new QrError("INVALID_FRAME", {});
  }
  const style = frame.style ?? "outline";
  if (style !== "none" && style !== "outline") throw new QrError("INVALID_FRAME_STYLE", {});
  if (
    frame.color !== undefined &&
    (typeof frame.color !== "string" || !OPAQUE_HEX_COLOR.test(frame.color))
  ) {
    throw new QrError("INVALID_COLOR", { target: "frame" });
  }
  const widthPx = frame.widthPx ?? DEFAULT_FRAME_WIDTH_PX;
  if (
    !Number.isFinite(widthPx) ||
    widthPx <= 0 ||
    widthPx >= outputSize * MAX_FRAME_WIDTH_FRACTION
  ) {
    throw new QrError("INVALID_FRAME_WIDTH", {
      maximumExclusive: outputSize * MAX_FRAME_WIDTH_FRACTION,
    });
  }
  return { style, color: frame.color, widthPx };
}
