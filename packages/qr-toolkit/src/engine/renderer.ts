import {
  ERROR_CORRECTION_LEVELS,
  QR_FINDER_PATTERN_SIZE,
  QR_FRAME_PADDING_MODULES,
  QR_QUIET_ZONE_DEFAULT_MODULES,
  QR_QUIET_ZONE_MIN_MODULES,
  QR_SVG_DEFAULT_SIZE_PX,
  QR_VERSION_DIMENSION_BASE,
  QR_VERSION_DIMENSION_STEP,
  QR_VERSION_MAX,
  QR_VERSION_MIN,
} from "./constants.js";
import { createQrFinderPatterns, createQrFunctionModules } from "./layout.js";
import type {
  QrCaptionOptions,
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

/** Leave a narrow backing pad around logos unless the caller chooses otherwise. */
const DEFAULT_LOGO_PADDING_MODULES = 0.5;

/** SVG data images are limited to passive raster formats; active SVG is excluded. */
const LOGO_DATA_URI = /^data:image\/(?:png|jpeg|webp);base64,([a-z\d+/]+={0,2})$/i;

/** Caption sizing is expressed in output pixels, then converted to viewBox units. */
const CAPTION_FONT_SIZE_PX = 18;

/** Keep a little vertical breathing room around the caption text. */
const CAPTION_LINE_HEIGHT = 1.8;

/** Pixel inset keeps an optional SVG frame stroke inside its viewBox. */
const FRAME_STROKE_INSET = 0.5;

/** Restrict output geometry values to finite, positive module-unit numbers. */
const POSITIVE_MODULE_VALUE = (value: number) => Number.isFinite(value) && value > 0;

interface NormalizedLogo {
  readonly dataUri: string;
  readonly widthModules: number;
  readonly paddingModules: number;
}

interface NormalizedCaption {
  readonly text: string;
  readonly color: string;
  readonly background: string;
  readonly style: "plain" | "banner";
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
  if (!isValidQrMatrix(matrix)) throw new TypeError("Invalid QR matrix.");

  const {
    size = QR_SVG_DEFAULT_SIZE_PX,
    quietZone = QR_QUIET_ZONE_DEFAULT_MODULES,
    foreground = "#000000",
    background = "#ffffff",
    moduleShape = "square",
    finderShape = "square",
    logo,
    caption,
    frame = "none",
  } = options;

  validateRenderOptions(size, quietZone, background, moduleShape, finderShape, frame);
  const normalizedForeground = normalizeForeground(foreground);
  const normalizedLogo = logo === undefined ? undefined : normalizeLogo(logo, matrix.size);
  const normalizedCaption =
    caption === undefined ? undefined : normalizeCaption(caption, background, normalizedForeground);

  if (
    normalizedLogo &&
    getNormalizedLogoOverlayDetails(matrix, normalizedLogo).overlapsFunctionModules
  ) {
    throw new RangeError("Logo knockout cannot cover QR function modules.");
  }

  const quietExtent = matrix.size + quietZone * 2;
  const framePadding = frame === "outline" ? QR_FRAME_PADDING_MODULES : 0;
  const viewBoxExtent = quietExtent + framePadding * 2;
  if (!Number.isSafeInteger(viewBoxExtent)) {
    throw new RangeError("SVG viewBox exceeds safe integer dimensions.");
  }

  const qrOrigin = framePadding + quietZone;
  const captionFontSize = normalizedCaption ? (CAPTION_FONT_SIZE_PX * viewBoxExtent) / size : 0;
  const captionHeight = captionFontSize * CAPTION_LINE_HEIGHT;
  const viewBoxHeight = viewBoxExtent + captionHeight;
  const outputHeight = size + captionHeight * (size / viewBoxExtent);
  const moduleMarkup = renderModules(matrix, qrOrigin, moduleShape, finderShape);
  const logoMarkup = normalizedLogo ? renderLogo(matrix, normalizedLogo, qrOrigin, background) : "";
  const captionMarkup = normalizedCaption
    ? renderCaption(normalizedCaption, framePadding, viewBoxExtent, viewBoxHeight, captionHeight)
    : "";
  const frameMarkup =
    frame === "outline"
      ? `<rect x="${FRAME_STROKE_INSET}" y="${FRAME_STROKE_INSET}" width="${viewBoxExtent - FRAME_STROKE_INSET * 2}" height="${viewBoxHeight - FRAME_STROKE_INSET * 2}" rx="1" fill="none" stroke="${normalizedForeground.fill}"/>`
      : "";
  const gradientDefinition = normalizedForeground.definition;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${formatNumber(outputHeight)}" viewBox="0 0 ${viewBoxExtent} ${formatNumber(viewBoxHeight)}">` +
    (gradientDefinition ? `<defs>${gradientDefinition}</defs>` : "") +
    `<rect width="${viewBoxExtent}" height="${formatNumber(viewBoxHeight)}" fill="${background}"/>` +
    moduleMarkup.replaceAll("__QR_FOREGROUND__", normalizedForeground.fill) +
    logoMarkup +
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
  frame: "none" | "outline",
): void {
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError("SVG size must be a positive safe integer.");
  }

  if (!Number.isSafeInteger(quietZone) || quietZone < QR_QUIET_ZONE_MIN_MODULES) {
    throw new RangeError(
      `Quiet zone must be an integer of at least ${QR_QUIET_ZONE_MIN_MODULES} modules.`,
    );
  }

  if (!isOpaqueHexColor(background)) {
    throw new TypeError("SVG background must use opaque #RGB or #RRGGBB notation.");
  }

  if (!isQrModuleShape(moduleShape) || !isQrModuleShape(finderShape)) {
    throw new TypeError("QR module shape must be square, rounded, or circle.");
  }

  if (frame !== "none" && frame !== "outline") {
    throw new TypeError("QR frame must be none or outline.");
  }
}

function normalizeForeground(foreground: string | QrLinearGradient): NormalizedForeground {
  if (typeof foreground === "string") {
    if (!isOpaqueHexColor(foreground)) {
      throw new TypeError("SVG foreground must use opaque #RGB or #RRGGBB notation.");
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
    throw new TypeError("Linear gradient requires a supported direction and opaque hex colors.");
  }

  const directions = {
    horizontal: `x1="0%" y1="0%" x2="100%" y2="0%"`,
    vertical: `x1="0%" y1="0%" x2="0%" y2="100%"`,
    diagonal: `x1="0%" y1="0%" x2="100%" y2="100%"`,
  } as const;
  const definition =
    `<linearGradient id="qr-foreground-gradient" ${directions[foreground.direction]}>` +
    `<stop offset="0%" stop-color="${foreground.startColor}"/>` +
    `<stop offset="100%" stop-color="${foreground.endColor}"/>` +
    "</linearGradient>";

  return {
    fill: "url(#qr-foreground-gradient)",
    definition,
    solidColor: null,
  };
}

function normalizeLogo(logo: QrLogoOptions, matrixSize: number): NormalizedLogo {
  if (!logo || typeof logo !== "object") {
    throw new TypeError("Logo options must be an object.");
  }

  const paddingModules = logo.paddingModules ?? DEFAULT_LOGO_PADDING_MODULES;
  const logoExtent = logo.widthModules + paddingModules * 2;

  if (
    typeof logo.dataUri !== "string" ||
    logo.dataUri.length > MAX_LOGO_DATA_URI_LENGTH ||
    !LOGO_DATA_URI.test(logo.dataUri)
  ) {
    throw new TypeError("Logo must be a bounded base64 PNG, JPEG, or WebP data URI.");
  }

  if (
    !POSITIVE_MODULE_VALUE(logo.widthModules) ||
    !Number.isFinite(paddingModules) ||
    paddingModules < 0 ||
    logoExtent > matrixSize
  ) {
    throw new RangeError("Logo size and padding must fit inside the QR symbol.");
  }

  return {
    dataUri: logo.dataUri,
    widthModules: logo.widthModules,
    paddingModules,
  };
}

function normalizeCaption(
  caption: QrCaptionOptions,
  background: string,
  foreground: NormalizedForeground,
): NormalizedCaption {
  if (
    !caption ||
    typeof caption !== "object" ||
    typeof caption.text !== "string" ||
    caption.text.trim().length === 0
  ) {
    throw new TypeError("Caption text must be a non-empty string.");
  }

  const color = caption.color ?? foreground.solidColor ?? "#000000";
  const captionBackground = caption.background ?? background;
  const style = caption.style ?? "plain";

  if (!isOpaqueHexColor(color) || !isOpaqueHexColor(captionBackground)) {
    throw new TypeError("Caption colors must use opaque #RGB or #RRGGBB notation.");
  }
  if (style !== "plain" && style !== "banner") {
    throw new TypeError("Caption style must be plain or banner.");
  }

  return { text: caption.text, color, background: captionBackground, style };
}

function renderModules(
  matrix: QrMatrix,
  origin: number,
  moduleShape: QrModuleShape,
  finderShape: QrModuleShape,
): string {
  const squarePaths: string[] = [];
  const roundedRects: string[] = [];
  const circles: string[] = [];

  for (let y = 0; y < matrix.size; y++) {
    const row = matrix.modules[y]!;
    let x = 0;

    while (x < matrix.size) {
      if (!row[x]) {
        x++;
        continue;
      }

      const shape = shapeAt(matrix, x, y, moduleShape, finderShape);
      if (shape === "square") {
        const start = x;
        while (
          x < matrix.size &&
          row[x] &&
          shapeAt(matrix, x, y, moduleShape, finderShape) === "square"
        ) {
          x++;
        }
        const width = x - start;
        squarePaths.push(`M${start + origin} ${y + origin}h${width}v${QR_MODULE_UNIT}h-${width}z`);
        continue;
      }

      const moduleX = x + origin;
      const moduleY = y + origin;
      if (shape === "rounded") {
        roundedRects.push(
          `<rect x="${moduleX}" y="${moduleY}" width="1" height="1" rx="${ROUNDED_MODULE_RADIUS}"/>`,
        );
      } else {
        circles.push(
          `<circle cx="${moduleX + 0.5}" cy="${moduleY + 0.5}" r="${CIRCLE_MODULE_RADIUS}"/>`,
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

function renderLogo(
  matrix: QrMatrix,
  logo: NormalizedLogo,
  origin: number,
  background: string,
): string {
  const clearExtent = logo.widthModules + logo.paddingModules * 2;
  const clearStart = (matrix.size - clearExtent) / 2 + origin;
  const logoStart = (matrix.size - logo.widthModules) / 2 + origin;

  return (
    `<rect x="${formatNumber(clearStart)}" y="${formatNumber(clearStart)}" width="${formatNumber(clearExtent)}" height="${formatNumber(clearExtent)}" fill="${background}"/>` +
    `<image x="${formatNumber(logoStart)}" y="${formatNumber(logoStart)}" width="${formatNumber(logo.widthModules)}" height="${formatNumber(logo.widthModules)}" href="${logo.dataUri}" preserveAspectRatio="xMidYMid meet"/>`
  );
}

function renderCaption(
  caption: NormalizedCaption,
  framePadding: number,
  viewBoxExtent: number,
  viewBoxHeight: number,
  captionHeight: number,
): string {
  const captionTop = viewBoxHeight - captionHeight;
  const band =
    caption.style === "banner"
      ? `<rect x="${framePadding}" y="${formatNumber(captionTop)}" width="${viewBoxExtent - framePadding * 2}" height="${formatNumber(captionHeight)}" fill="${caption.background}"/>`
      : "";
  const text =
    `<text x="${viewBoxExtent / 2}" y="${formatNumber(captionTop + captionHeight / 2)}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${formatNumber(captionHeight / CAPTION_LINE_HEIGHT)}" fill="${caption.color}">` +
    `${escapeXml(caption.text)}</text>`;

  return band + text;
}

export function inspectQrLogoOverlay(matrix: QrMatrix, logo: QrLogoOptions): QrLogoOverlayDetails {
  return getNormalizedLogoOverlayDetails(matrix, normalizeLogo(logo, matrix.size));
}

function getNormalizedLogoOverlayDetails(
  matrix: QrMatrix,
  logo: NormalizedLogo,
): QrLogoOverlayDetails {
  const clearExtent = logo.widthModules + logo.paddingModules * 2;
  const left = (matrix.size - clearExtent) / 2;
  const right = left + clearExtent;
  const top = left;
  const bottom = top + clearExtent;
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
    coveragePercent: (clearExtent ** 2 / matrix.size ** 2) * 100,
    overlapsFunctionModules,
  };
}

function isQrModuleShape(shape: string): shape is QrModuleShape {
  return shape === "square" || shape === "rounded" || shape === "circle";
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
