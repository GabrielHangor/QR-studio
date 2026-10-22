import {
  QR_FRAME_PADDING_MODULES,
  QR_QUIET_ZONE_DEFAULT_MODULES,
  QR_SVG_DEFAULT_SIZE_PX,
} from "./constants.js";
import { QrError } from "./errors.js";
import { normalizeQrFrame } from "./frame.js";
import type { QrCaptionOptions, RenderQrSvgOptions } from "./types.js";

/** Default text size in output pixels, independent of QR version. */
const CAPTION_FONT_SIZE_PX = 18;

/** Reserve a band wider than the glyphs to keep lettering away from the quiet zone. */
const CAPTION_LINE_HEIGHT = 1.8;

/** Keep lettering half a module beyond the square quiet zone. */
const ARC_QUIET_ZONE_GAP_MODULES = 0.5;

/** Average glyph advance controls the visual text length, enforced by SVG textLength. */
const ARC_GLYPH_ADVANCE_EM = 0.65;

/** Reserve both tall glyphs and descenders when fitting text into a circular cap. */
const ARC_GLYPH_HEIGHT_EM = 1.7;

/** Baselines leave ascender space above and descender space below the circular path. */
const ARC_BASELINE_INSET_EM = { top: 1.3, bottom: 0.4 } as const;

/** Leave half an em at each end for glyph bearings and their rotation along the arc. */
const ARC_ENDPOINT_PADDING_EM = 1;

/** A bounded binary search resolves font size well below SVG's coordinate precision. */
const ARC_FIT_ITERATIONS = 24;

/** Leave a small gap between the encoded square and the artwork/frame at maximum zoom. */
const CODE_EDGE_CLEARANCE_MODULES = 0.5;

export interface QrCaptionLayout {
  readonly options: QrCaptionOptions;
  readonly position: "top" | "bottom";
  readonly style: "plain" | "banner" | "arc";
  readonly fontSize: number;
  readonly height: number;
  readonly fontWeight: 400 | 500 | 600 | 700;
  readonly letterSpacing: number;
  readonly arc?: { readonly radius: number; readonly textLength: number };
}

function fitArcCaption(
  caption: QrCaptionLayout,
  outerRadius: number,
  quietHalfExtent: number,
): QrCaptionLayout {
  const glyphCount = Array.from(caption.options.text.trim().replace(/\s+/g, " ")).length;
  const textAdvance =
    glyphCount * ARC_GLYPH_ADVANCE_EM +
    (Math.max(0, glyphCount - 1) * caption.letterSpacing) / caption.fontSize;
  const protectedHalfExtent = quietHalfExtent + ARC_QUIET_ZONE_GAP_MODULES;
  let lower = 0;
  let upper = Math.max(
    0,
    Math.min(caption.fontSize, (outerRadius - protectedHalfExtent) / ARC_GLYPH_HEIGHT_EM),
  );

  for (let iteration = 0; iteration < ARC_FIT_ITERATIONS; iteration++) {
    const fontSize = (lower + upper) / 2;
    const radius = outerRadius - fontSize * ARC_BASELINE_INSET_EM[caption.position];
    const innerRadius = outerRadius - fontSize * ARC_GLYPH_HEIGHT_EM;
    // The entire text envelope must stay above/below the quiet-zone square,
    // including the ends of the arc; the rest of the circle stays available to QR.
    const availableAngle = Math.acos(Math.min(1, protectedHalfExtent / innerRadius));
    const requiredLength = fontSize * (textAdvance + ARC_ENDPOINT_PADDING_EM);
    if (requiredLength <= radius * availableAngle * 2) lower = fontSize;
    else upper = fontSize;
  }

  return {
    ...caption,
    fontSize: lower,
    height: lower * CAPTION_LINE_HEIGHT,
    letterSpacing: (caption.letterSpacing * lower) / caption.fontSize,
    arc: {
      radius: outerRadius - lower * ARC_BASELINE_INSET_EM[caption.position],
      textLength: lower * textAdvance,
    },
  };
}

/** Shared geometry keeps renderer placement and diagnostic module pitch in agreement. */
export function getQrArtworkLayout(matrixSize: number, options: RenderQrSvgOptions) {
  const size = options.size ?? QR_SVG_DEFAULT_SIZE_PX;
  const quietZone = options.quietZone ?? QR_QUIET_ZONE_DEFAULT_MODULES;
  const shape = options.shape ?? "square";

  const frame = normalizeQrFrame(options.frame, size);
  if (shape !== "square" && shape !== "circle") {
    throw new QrError("INVALID_ARTWORK_SHAPE", {});
  }

  if (
    options.codeScale !== undefined &&
    (!Number.isFinite(options.codeScale) || options.codeScale <= 0)
  ) {
    throw new QrError("INVALID_CODE_SCALE", {});
  }
  const quietExtent = matrixSize + quietZone * 2;
  const baseFramePadding = frame.style !== "none" ? QR_FRAME_PADDING_MODULES : 0;
  if (!Number.isSafeInteger(quietExtent + baseFramePadding * 2)) {
    throw new QrError("SVG_DIMENSIONS_TOO_LARGE", {});
  }
  let input: readonly QrCaptionOptions[] = [];
  if (Array.isArray(options.caption)) {
    input = options.caption;
  } else if (options.caption !== undefined) {
    input = [options.caption as QrCaptionOptions];
  }
  const positions = new Set<string>();
  const captions = input.map((caption: QrCaptionOptions) => {
    if (
      !caption ||
      typeof caption !== "object" ||
      typeof caption.text !== "string" ||
      !caption.text.trim()
    ) {
      throw new QrError("INVALID_CAPTION_TEXT", {});
    }
    const position = caption.position ?? "bottom";
    const style = caption.style ?? "plain";
    const fontSize = caption.fontSize ?? CAPTION_FONT_SIZE_PX;
    const fontWeight = caption.fontWeight ?? 400;
    const letterSpacing = caption.letterSpacing ?? 0;
    if (position !== "top" && position !== "bottom") {
      throw new QrError("INVALID_CAPTION_POSITION", {});
    }
    if (positions.has(position)) {
      throw new QrError("DUPLICATE_CAPTION_POSITION", { position });
    }
    positions.add(position);
    if (style !== "plain" && style !== "banner" && style !== "arc") {
      throw new QrError("INVALID_CAPTION_STYLE", {});
    }
    if (style === "arc" && shape !== "circle") {
      throw new QrError("ARC_CAPTION_REQUIRES_CIRCLE", {});
    }
    if (!Number.isFinite(fontSize) || fontSize <= 0) {
      throw new QrError("INVALID_CAPTION_FONT_SIZE", {});
    }
    if (![400, 500, 600, 700].includes(fontWeight)) {
      throw new QrError("INVALID_CAPTION_FONT_WEIGHT", {});
    }
    if (!Number.isFinite(letterSpacing) || letterSpacing < 0 || letterSpacing > 10) {
      throw new QrError("INVALID_CAPTION_LETTER_SPACING", { minimum: 0, maximum: 10 });
    }
    return {
      options: caption,
      position,
      style,
      fontSize,
      fontWeight,
      letterSpacing,
      height: fontSize * CAPTION_LINE_HEIGHT,
    };
  });

  // 100% encloses the entire quiet-zone square, including all four corners.
  const frameWidthPx = frame.style !== "none" ? (frame.widthPx ?? 0) : 0;
  // A pixel stroke reserves its full thickness on each side, without touching the quiet zone.
  const strokeSpace = 1 - (frameWidthPx * 2) / size;
  const protectedExtent = quietExtent * (shape === "circle" ? Math.SQRT2 : 1);
  // Legacy module strokes still need a module of clearance on each side.
  const minimumPadding =
    frame.style !== "none" && frame.widthPx === undefined ? baseFramePadding : 0;
  const minimumExtent = (protectedExtent + minimumPadding * 2) / strokeSpace;
  const legacyExtent = (protectedExtent + baseFramePadding * 2) / strokeSpace;
  const codeExtent = matrixSize * (shape === "circle" ? Math.SQRT2 : 1);
  const tightExtent =
    (codeExtent + CODE_EDGE_CLEARANCE_MODULES * 2 + minimumPadding * 2) / strokeSpace;
  const maximumCodeScale = Math.max(100, Math.floor((minimumExtent * 100) / tightExtent));
  // A stored zoom remains usable when content, shape or frame changes its geometric limit.
  const codeScale = Math.min(
    options.codeScale ?? (minimumExtent * 100) / legacyExtent,
    maximumCodeScale,
  );
  const extent = options.codeScale === undefined ? legacyExtent : (minimumExtent * 100) / codeScale;
  const quietZoneClipped = codeScale > 100;
  if (!Number.isFinite(extent) || extent > Number.MAX_SAFE_INTEGER) {
    throw new QrError("SVG_DIMENSIONS_TOO_LARGE", {});
  }
  const modulePitchPx = size / extent;
  let frameStrokeWidth = 0;
  if (frame.style !== "none") {
    frameStrokeWidth = frame.widthPx === undefined ? 1 : frameWidthPx / modulePitchPx;
  }
  const framePadding = baseFramePadding + frameWidthPx / modulePitchPx;
  const captionLayouts: QrCaptionLayout[] = captions.map((caption) => {
    const layout: QrCaptionLayout = {
      options: caption.options,
      position: caption.position,
      style: caption.style,
      fontWeight: caption.fontWeight,
      fontSize: caption.fontSize / modulePitchPx,
      height: caption.height / modulePitchPx,
      letterSpacing: caption.letterSpacing / modulePitchPx,
    };
    return caption.style === "arc"
      ? fitArcCaption(
          layout,
          extent / 2 - framePadding,
          (quietZoneClipped ? Math.min(quietExtent, extent / Math.SQRT2) : quietExtent) / 2,
        )
      : layout;
  });
  const captionInset = shape === "square" ? frameStrokeWidth : 0;
  const topCaptionHeight =
    captionLayouts.find((caption) => caption.position === "top" && caption.style !== "arc")
      ?.height ?? 0;
  const bottomCaptionHeight =
    captionLayouts.find((caption) => caption.position === "bottom" && caption.style !== "arc")
      ?.height ?? 0;
  const topHeight = topCaptionHeight ? topCaptionHeight + captionInset : 0;
  const bottomHeight = bottomCaptionHeight ? bottomCaptionHeight + captionInset : 0;
  const height = extent + topHeight + bottomHeight;
  if (!Number.isFinite(height) || height > Number.MAX_SAFE_INTEGER) {
    throw new QrError("SVG_DIMENSIONS_TOO_LARGE", {});
  }
  return {
    shape,
    extent,
    height,
    topHeight,
    framePadding,
    frame,
    frameStrokeWidth,
    captionInset,
    qrOrigin: (extent - matrixSize) / 2,
    modulePitchPx,
    codeScale,
    maximumCodeScale,
    quietZoneClipped,
    captions: captionLayouts,
  };
}
