import { getQrArtworkLayout, type QrCaptionLayout } from "./artwork.js";
import {
  ERROR_CORRECTION_LEVELS,
  QR_FINDER_PATTERN_SIZE,
  QR_QUIET_ZONE_DEFAULT_MODULES,
  QR_QUIET_ZONE_MIN_MODULES,
  QR_SVG_DEFAULT_SIZE_PX,
  QR_VERSION_DIMENSION_BASE,
  QR_VERSION_DIMENSION_STEP,
  QR_VERSION_MAX,
  QR_VERSION_MIN,
} from "./constants.js";
import { QrError } from "./errors.js";
import { normalizeQrFinder, renderQrFinders } from "./finders.js";
import { createQrFinderPatterns, createQrFunctionModules } from "./layout.js";
import { cornerShapePath, isQrModuleShape, leafPath, SOFT_CORNER_RADIUS_RATIO } from "./shapes.js";
import type {
  QrLinearGradient,
  QrLogoOptions,
  QrMatrix,
  QrModuleShape,
  RenderQrSvgOptions,
} from "./types.js";

/** Restrict SVG paints to opaque RGB hex values before adding them to markup. */
const OPAQUE_HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

/** One matrix module occupies one unit in the SVG viewBox. */
const QR_MODULE_UNIT = 1;

/** Rounded data modules keep a visible gap while staying close to square modules. */
const ROUNDED_MODULE_RADIUS = 0.2;

/** Circular modules leave a small gap between neighboring dark cells. */
const CIRCLE_MODULE_RADIUS = 0.44;

/** Logo data URIs are bounded so a caller cannot create an unbounded SVG string. */
const MAX_LOGO_DATA_URI_LENGTH = 1_000_000;

/** Leave a narrow clear gap around logos unless the caller chooses otherwise. */
const DEFAULT_LOGO_PADDING_MODULES = 0.5;

/** SVG data images are limited to passive raster formats; active SVG is excluded. */
const LOGO_DATA_URI = /^data:image\/(?:png|jpeg|webp);base64,([a-z\d+/]+={0,2})$/i;

/** Conservative glyph advance avoids DOM/font measurements and fits wide Unicode text. */
const CAPTION_GLYPH_ADVANCE = 1.2;

/** Restrict output geometry values to finite, positive module-unit numbers. */
const POSITIVE_MODULE_VALUE = (value: number) => Number.isFinite(value) && value > 0;

interface NormalizedLogo {
  readonly dataUri: string;
  readonly widthModules: number;
  readonly paddingModules: number;
  readonly clearBackground: boolean;
  readonly x: number;
  readonly y: number;
}

interface LogoBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface NormalizedForeground {
  readonly fill: string;
  readonly definition: string;
  readonly solidColor: string | null;
}

export interface QrLogoOverlayDetails {
  readonly coveragePercent: number;
  readonly overlapsFunctionModules: boolean;
}

/** Verify matrix dimensions and metadata before using any cell coordinates. */
export function isValidQrMatrix(matrix: QrMatrix): boolean {
  if (
    !matrix ||
    typeof matrix !== "object" ||
    !Number.isInteger(matrix.version) ||
    matrix.version < QR_VERSION_MIN ||
    matrix.version > QR_VERSION_MAX ||
    matrix.size !== matrix.version * QR_VERSION_DIMENSION_STEP + QR_VERSION_DIMENSION_BASE ||
    !ERROR_CORRECTION_LEVELS.some((level) => level === matrix.errorCorrectionLevel) ||
    !Array.isArray(matrix.modules) ||
    !Array.isArray(matrix.functionModules) ||
    matrix.modules.length !== matrix.size ||
    matrix.functionModules.length !== matrix.size ||
    !Array.isArray(matrix.finderPatterns)
  ) {
    return false;
  }

  const cellsAreValid = (rows: readonly (readonly unknown[])[]) =>
    rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === matrix.size &&
        row.every((cell) => typeof cell === "boolean"),
    );
  const expectedFinderPatterns = createQrFinderPatterns(matrix.size);

  if (
    cellsAreValid(matrix.modules) &&
    cellsAreValid(matrix.functionModules) &&
    matrix.finderPatterns.length === expectedFinderPatterns.length &&
    matrix.finderPatterns.every(
      (pattern, index) =>
        pattern !== null &&
        typeof pattern === "object" &&
        pattern.x === expectedFinderPatterns[index]!.x &&
        pattern.y === expectedFinderPatterns[index]!.y,
    )
  ) {
    const expectedFunctionModules = createQrFunctionModules(matrix.version);
    return matrix.functionModules.every((row: readonly boolean[], y: number) =>
      row.every((cell: boolean, x: number) => cell === expectedFunctionModules[y]![x]),
    );
  }

  return false;
}

/**
 * Render a QR matrix to a deterministic SVG string. The same output can be used
 * for preview and SVG download; this function does not access the DOM or canvas.
 */
export function renderQrSvg(matrix: QrMatrix, options: RenderQrSvgOptions = {}): string {
  if (!isValidQrMatrix(matrix)) throw new QrError("INVALID_MATRIX", {});

  const {
    size = QR_SVG_DEFAULT_SIZE_PX,
    quietZone = QR_QUIET_ZONE_DEFAULT_MODULES,
    foreground = "#000000",
    background = "#ffffff",
    moduleShape = "square",
    finderShape = "square",
    logo,
  } = options;

  validateRenderOptions(size, quietZone, background, moduleShape, finderShape);
  const layout = getQrArtworkLayout(matrix.size, options);
  const artworkBackground = options.artworkBackground ?? background;
  if (!isOpaqueHexColor(artworkBackground)) {
    throw new QrError("INVALID_COLOR", { target: "artworkBackground" });
  }
  const normalizedForeground = normalizeForeground(foreground, layout.qrOrigin, matrix.size);
  const normalizedLogo = logo === undefined ? undefined : normalizeLogo(logo, matrix);
  const normalizedFinder = normalizeQrFinder(options.finder);

  if (
    normalizedLogo &&
    getNormalizedLogoOverlayDetails(matrix, normalizedLogo).overlapsFunctionModules
  ) {
    throw new QrError("LOGO_OVERLAPS_FUNCTION_MODULES", {});
  }

  const { extent, height, qrOrigin, topHeight } = layout;
  const outputHeight = height * layout.modulePitchPx;
  const moduleMarkup = renderModules(
    matrix,
    qrOrigin,
    moduleShape,
    finderShape,
    !!normalizedFinder,
    normalizedLogo?.clearBackground ? getLogoBounds(normalizedLogo) : undefined,
  );
  const finderMarkup = normalizedFinder
    ? renderQrFinders(matrix, qrOrigin, normalizedFinder, normalizedForeground.fill)
    : "";
  const logoMarkup = normalizedLogo ? renderLogo(normalizedLogo, qrOrigin) : "";
  const captionMarkup = layout.captions
    .map((caption) => renderCaption(caption, layout, background, normalizedForeground))
    .join("");
  const circleGeometry = `cx="${formatNumber(extent / 2)}" cy="${formatNumber(topHeight + extent / 2)}"`;
  const strokeInset = layout.frameStrokeWidth / 2;
  const frameColor =
    layout.frame.color ??
    (typeof options.frame === "object"
      ? (normalizedForeground.solidColor ?? "#000000")
      : normalizedForeground.fill);
  const dash =
    layout.frame.style === "dashed"
      ? ` stroke-dasharray="${formatNumber(layout.frameStrokeWidth * 4)} ${formatNumber(layout.frameStrokeWidth * 3)}"`
      : "";
  const strokeAttributes = `fill="none" stroke="${frameColor}" stroke-width="${formatNumber(layout.frameStrokeWidth)}"${dash}`;
  let frameMarkup = "";
  if (layout.frame.style !== "none") {
    frameMarkup =
      layout.shape === "circle"
        ? `<circle ${circleGeometry} r="${formatNumber(extent / 2 - strokeInset)}" ${strokeAttributes}/>`
        : `<rect x="${formatNumber(strokeInset)}" y="${formatNumber(strokeInset)}" width="${formatNumber(extent - strokeInset * 2)}" height="${formatNumber(height - strokeInset * 2)}" rx="1" ${strokeAttributes}/>`;
  }
  const backgroundMarkup =
    layout.shape === "circle"
      ? `<circle ${circleGeometry} r="${formatNumber(extent / 2)}" fill="${artworkBackground}"/>`
      : `<rect width="${formatNumber(extent)}" height="${formatNumber(height)}" fill="${artworkBackground}"/>`;
  const quietExtent = matrix.size + quietZone * 2;
  // Only the backing is clipped; every encoded module remains intact inside the artwork.
  const clipBackground = layout.quietZoneClipped && artworkBackground !== background;
  const clipDefinition = clipBackground
    ? `<clipPath id="qr-artwork-clip">${
        layout.shape === "circle"
          ? `<circle ${circleGeometry} r="${formatNumber(extent / 2)}"/>`
          : `<rect y="${formatNumber(topHeight)}" width="${formatNumber(extent)}" height="${formatNumber(extent)}"/>`
      }</clipPath>`
    : "";
  const quietBackgroundMarkup =
    artworkBackground !== background
      ? `<rect x="${formatNumber(qrOrigin - quietZone)}" y="${formatNumber(topHeight + qrOrigin - quietZone)}" width="${quietExtent}" height="${quietExtent}" fill="${background}"${clipBackground ? ' clip-path="url(#qr-artwork-clip)"' : ""}/>`
      : "";
  const artworkMarkup =
    moduleMarkup.replaceAll("__QR_FOREGROUND__", normalizedForeground.fill) +
    finderMarkup +
    logoMarkup;
  const gradientDefinition = normalizedForeground.definition;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${formatNumber(outputHeight)}" viewBox="0 0 ${formatNumber(extent)} ${formatNumber(height)}">` +
    (gradientDefinition || clipDefinition
      ? `<defs>${gradientDefinition}${clipDefinition}</defs>`
      : "") +
    backgroundMarkup +
    quietBackgroundMarkup +
    (topHeight
      ? `<g transform="translate(0 ${formatNumber(topHeight)})">${artworkMarkup}</g>`
      : artworkMarkup) +
    captionMarkup +
    frameMarkup +
    "</svg>"
  );
}

function validateRenderOptions(
  size: number,
  quietZone: number,
  background: string,
  moduleShape: QrModuleShape,
  finderShape: QrModuleShape,
): void {
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new QrError("INVALID_OUTPUT_SIZE", { minimum: 1 });
  }

  if (!Number.isSafeInteger(quietZone) || quietZone < QR_QUIET_ZONE_MIN_MODULES) {
    throw new QrError("INVALID_QUIET_ZONE", { minimum: QR_QUIET_ZONE_MIN_MODULES });
  }

  if (!isOpaqueHexColor(background)) {
    throw new QrError("INVALID_COLOR", { target: "background" });
  }

  if (!isQrModuleShape(moduleShape)) {
    throw new QrError("INVALID_MODULE_SHAPE", { target: "modules" });
  }
  if (!isQrModuleShape(finderShape)) {
    throw new QrError("INVALID_MODULE_SHAPE", { target: "finderCells" });
  }
}

function normalizeForeground(
  foreground: string | QrLinearGradient,
  origin: number,
  matrixSize: number,
): NormalizedForeground {
  if (typeof foreground === "string") {
    if (!isOpaqueHexColor(foreground)) {
      throw new QrError("INVALID_COLOR", { target: "foreground" });
    }
    return { fill: foreground, definition: "", solidColor: foreground };
  }

  if (
    !foreground ||
    typeof foreground !== "object" ||
    foreground.type !== "linear" ||
    !["horizontal", "vertical", "diagonal"].includes(foreground.direction) ||
    !isOpaqueHexColor(foreground.startColor) ||
    !isOpaqueHexColor(foreground.endColor)
  ) {
    throw new QrError("INVALID_GRADIENT", {});
  }

  const start = formatNumber(origin);
  const end = formatNumber(origin + matrixSize);
  const directions = {
    horizontal: `x1="${start}" y1="${start}" x2="${end}" y2="${start}"`,
    vertical: `x1="${start}" y1="${start}" x2="${start}" y2="${end}"`,
    diagonal: `x1="${start}" y1="${start}" x2="${end}" y2="${end}"`,
  } as const;
  const definition =
    `<linearGradient id="qr-foreground-gradient" gradientUnits="userSpaceOnUse" ${directions[foreground.direction]}>` +
    `<stop offset="0%" stop-color="${foreground.startColor}"/>` +
    `<stop offset="100%" stop-color="${foreground.endColor}"/>` +
    "</linearGradient>";

  return {
    fill: "url(#qr-foreground-gradient)",
    definition,
    solidColor: null,
  };
}

function normalizeLogo(logo: QrLogoOptions, matrix: QrMatrix): NormalizedLogo {
  const matrixSize = matrix.size;
  if (!logo || typeof logo !== "object") {
    throw new QrError("INVALID_LOGO_OPTIONS", {});
  }

  if (logo.clearBackground !== undefined && typeof logo.clearBackground !== "boolean") {
    throw new QrError("INVALID_LOGO_OPTIONS", {});
  }
  const paddingModules =
    logo.clearBackground === false ? 0 : (logo.paddingModules ?? DEFAULT_LOGO_PADDING_MODULES);
  const logoExtent = logo.widthModules + paddingModules * 2;

  if (
    typeof logo.dataUri !== "string" ||
    logo.dataUri.length > MAX_LOGO_DATA_URI_LENGTH ||
    !LOGO_DATA_URI.test(logo.dataUri)
  ) {
    throw new QrError("INVALID_LOGO_DATA", {});
  }

  if (
    !POSITIVE_MODULE_VALUE(logo.widthModules) ||
    !Number.isFinite(paddingModules) ||
    paddingModules < 0 ||
    logoExtent > matrixSize
  ) {
    throw new QrError("INVALID_LOGO_SIZE", { matrixSize });
  }

  return positionLogo(matrix, {
    dataUri: logo.dataUri,
    widthModules: logo.widthModules,
    paddingModules,
    clearBackground: logo.clearBackground ?? true,
    x: (matrixSize - logo.widthModules) / 2,
    y: (matrixSize - logo.widthModules) / 2,
  });
}

/** Prefer the center; move by whole modules only when protected cells occupy it. */
function positionLogo(matrix: QrMatrix, centered: NormalizedLogo): NormalizedLogo {
  if (!getNormalizedLogoOverlayDetails(matrix, centered).overlapsFunctionModules) return centered;
  const bounds = getLogoBounds(centered);
  // A summed-area table makes each candidate intersection check constant-time.
  const stride = matrix.size + 1;
  const protectedCells = new Uint32Array(stride * stride);
  for (let y = 0; y < matrix.size; y++) {
    let rowCount = 0;
    for (let x = 0; x < matrix.size; x++) {
      rowCount += Number(matrix.functionModules[y]![x]);
      protectedCells[(y + 1) * stride + x + 1] = protectedCells[y * stride + x + 1]! + rowCount;
    }
  }
  let closest = centered;
  let distance = Infinity;
  for (let dy = Math.ceil(-bounds.top); dy <= Math.floor(matrix.size - bounds.bottom); dy++) {
    for (let dx = Math.ceil(-bounds.left); dx <= Math.floor(matrix.size - bounds.right); dx++) {
      const nextDistance = dx * dx + dy * dy;
      if (nextDistance >= distance) continue;
      const left = Math.floor(bounds.left + dx);
      const top = Math.floor(bounds.top + dy);
      const right = Math.ceil(bounds.right + dx);
      const bottom = Math.ceil(bounds.bottom + dy);
      const count =
        protectedCells[bottom * stride + right]! -
        protectedCells[top * stride + right]! -
        protectedCells[bottom * stride + left]! +
        protectedCells[top * stride + left]!;
      if (count === 0) {
        closest = { ...centered, x: centered.x + dx, y: centered.y + dy };
        distance = nextDistance;
      }
    }
  }
  // Keep the existing error if no placement can preserve all protected cells.
  return closest;
}

function renderModules(
  matrix: QrMatrix,
  origin: number,
  moduleShape: QrModuleShape,
  finderShape: QrModuleShape,
  wholeFinders: boolean,
  clearedArea?: LogoBounds,
): string {
  const squarePaths: string[] = [];
  const roundedRects: string[] = [];
  const circles: string[] = [];

  for (let y = 0; y < matrix.size; y++) {
    const row = matrix.modules[y]!;
    let x = 0;

    while (x < matrix.size) {
      if (
        !row[x] ||
        isClearedModule(x, y, clearedArea) ||
        (wholeFinders && isFinderModule(x, y, matrix.finderPatterns))
      ) {
        x++;
        continue;
      }

      const shape = shapeAt(matrix, x, y, moduleShape, finderShape);
      if (shape === "square") {
        const start = x;
        while (
          x < matrix.size &&
          row[x] &&
          !isClearedModule(x, y, clearedArea) &&
          // oxlint-disable-next-line no-unmodified-loop-condition -- wholeFinders is fixed; the finder check depends on x, which advances below.
          !(wholeFinders && isFinderModule(x, y, matrix.finderPatterns)) &&
          shapeAt(matrix, x, y, moduleShape, finderShape) === "square"
        ) {
          x++;
        }
        const width = x - start;
        squarePaths.push(
          `M${formatNumber(start + origin)} ${formatNumber(y + origin)}h${width}v${QR_MODULE_UNIT}h-${width}z`,
        );
        continue;
      }

      const moduleX = x + origin;
      const moduleY = y + origin;
      const custom = cornerShapePath(moduleX, moduleY, 1, shape);
      if (custom) {
        roundedRects.push(`<path d="${custom}"/>`);
      } else if (shape === "leaf" || shape === "leaf-reverse") {
        roundedRects.push(`<path d="${leafPath(moduleX, moduleY, 1, shape === "leaf-reverse")}"/>`);
      } else if (shape === "rounded" || shape === "soft") {
        roundedRects.push(
          `<rect x="${formatNumber(moduleX)}" y="${formatNumber(moduleY)}" width="1" height="1" rx="${shape === "soft" ? SOFT_CORNER_RADIUS_RATIO : ROUNDED_MODULE_RADIUS}"/>`,
        );
      } else {
        circles.push(
          `<circle cx="${formatNumber(moduleX + 0.5)}" cy="${formatNumber(moduleY + 0.5)}" r="${CIRCLE_MODULE_RADIUS}"/>`,
        );
      }
      x++;
    }
  }

  const elements: string[] = [];
  if (squarePaths.length > 0) {
    elements.push(`<path d="${squarePaths.join("")}" fill="__QR_FOREGROUND__"/>`);
  }
  if (roundedRects.length > 0) {
    elements.push(`<g fill="__QR_FOREGROUND__">${roundedRects.join("")}</g>`);
  }
  if (circles.length > 0) {
    elements.push(`<g fill="__QR_FOREGROUND__">${circles.join("")}</g>`);
  }

  return elements.join("");
}

function shapeAt(
  matrix: QrMatrix,
  x: number,
  y: number,
  moduleShape: QrModuleShape,
  finderShape: QrModuleShape,
): QrModuleShape {
  if (isFinderModule(x, y, matrix.finderPatterns)) return finderShape;
  return matrix.functionModules[y]![x] ? "square" : moduleShape;
}

function isFinderModule(x: number, y: number, finderPatterns: QrMatrix["finderPatterns"]): boolean {
  return finderPatterns.some(
    (pattern) =>
      x >= pattern.x &&
      x < pattern.x + QR_FINDER_PATTERN_SIZE &&
      y >= pattern.y &&
      y < pattern.y + QR_FINDER_PATTERN_SIZE,
  );
}

function renderLogo(logo: NormalizedLogo, origin: number): string {
  return `<image x="${formatNumber(logo.x + origin)}" y="${formatNumber(logo.y + origin)}" width="${formatNumber(logo.widthModules)}" height="${formatNumber(logo.widthModules)}" data-qr-logo-clear="${logo.clearBackground}" href="${logo.dataUri}" preserveAspectRatio="xMidYMid meet"/>`;
}

/** Clear whole cells, so fractional logo dimensions never leave sliced module edges. */
function getLogoBounds(logo: NormalizedLogo): LogoBounds {
  const left = logo.x - logo.paddingModules;
  const top = logo.y - logo.paddingModules;
  const right = logo.x + logo.widthModules + logo.paddingModules;
  const bottom = logo.y + logo.widthModules + logo.paddingModules;
  return logo.clearBackground
    ? {
        left: Math.floor(left),
        top: Math.floor(top),
        right: Math.ceil(right),
        bottom: Math.ceil(bottom),
      }
    : { left, top, right, bottom };
}

function isClearedModule(x: number, y: number, area?: LogoBounds): boolean {
  return area !== undefined && x >= area.left && x < area.right && y >= area.top && y < area.bottom;
}

function renderCaption(
  caption: QrCaptionLayout,
  layout: ReturnType<typeof getQrArtworkLayout>,
  background: string,
  foreground: NormalizedForeground,
): string {
  const color = caption.options.color ?? foreground.solidColor ?? "#000000";
  const captionBackground = caption.options.background ?? background;
  if (!isOpaqueHexColor(color)) throw new QrError("INVALID_COLOR", { target: "caption" });
  if (!isOpaqueHexColor(captionBackground)) {
    throw new QrError("INVALID_COLOR", { target: "captionBackground" });
  }
  // A thick frame can leave no space for an arc caption at a tight zoom.
  if (caption.fontSize === 0) return "";
  const text = caption.options.text.trim().replace(/\s+/g, " ");
  const { extent, framePadding, topHeight } = layout;
  const availableWidth = extent - framePadding * 2;
  const fontSize = caption.arc
    ? caption.fontSize
    : Math.min(
        caption.fontSize,
        availableWidth /
          (Array.from(text).length * CAPTION_GLYPH_ADVANCE +
            (Math.max(0, Array.from(text).length - 1) * caption.letterSpacing) / caption.fontSize),
      );
  const letterSpacing = (caption.letterSpacing * fontSize) / caption.fontSize;
  const attributes = `text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${formatNumber(fontSize)}" font-weight="${caption.fontWeight}" letter-spacing="${formatNumber(letterSpacing)}" fill="${color}"`;

  if (caption.arc) {
    const { radius, textLength } = caption.arc;
    const id = `qr-caption-${caption.position}`;
    const center = extent / 2;
    const centerY = topHeight + center;
    // Opposite sweep directions keep both the upper and lower lines upright.
    const sweep = caption.position === "top" ? 1 : 0;
    const path = `M${formatNumber(center - radius)} ${formatNumber(centerY)} A${formatNumber(radius)} ${formatNumber(radius)} 0 0 ${sweep} ${formatNumber(center + radius)} ${formatNumber(centerY)}`;
    return (
      `<defs><path id="${id}" d="${path}"/></defs>` +
      `<text ${attributes} textLength="${formatNumber(textLength)}" lengthAdjust="spacingAndGlyphs"><textPath href="#${id}" startOffset="50%">${escapeXml(text)}</textPath></text>`
    );
  }

  const captionTop = caption.position === "top" ? layout.captionInset : topHeight + extent;
  const band =
    caption.style === "banner"
      ? `<rect x="${framePadding}" y="${formatNumber(captionTop)}" width="${formatNumber(availableWidth)}" height="${formatNumber(caption.height)}" fill="${captionBackground}"/>`
      : "";
  return (
    band +
    `<text x="${formatNumber(extent / 2)}" y="${formatNumber(captionTop + caption.height / 2)}" dominant-baseline="central" ${attributes}>${escapeXml(text)}</text>`
  );
}

export function inspectQrLogoOverlay(matrix: QrMatrix, logo: QrLogoOptions): QrLogoOverlayDetails {
  return getNormalizedLogoOverlayDetails(matrix, normalizeLogo(logo, matrix));
}

function getNormalizedLogoOverlayDetails(
  matrix: QrMatrix,
  logo: NormalizedLogo,
): QrLogoOverlayDetails {
  const { left, right, top, bottom } = getLogoBounds(logo);
  let overlapsFunctionModules = false;

  for (let y = 0; y < matrix.size; y++) {
    if (y >= bottom || y + 1 <= top) continue;
    for (let x = 0; x < matrix.size; x++) {
      if (x >= right || x + 1 <= left) continue;
      if (matrix.functionModules[y]![x]) {
        overlapsFunctionModules = true;
        break;
      }
    }
    if (overlapsFunctionModules) break;
  }

  return {
    coveragePercent: (((right - left) * (bottom - top)) / matrix.size ** 2) * 100,
    overlapsFunctionModules,
  };
}

function isOpaqueHexColor(color: unknown): color is string {
  return typeof color === "string" && OPAQUE_HEX_COLOR.test(color);
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}
