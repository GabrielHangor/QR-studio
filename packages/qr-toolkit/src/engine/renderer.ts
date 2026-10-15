import type { QrMatrix, RenderQrSvgOptions } from "./types.js";
import {
  ERROR_CORRECTION_LEVELS,
  QR_QUIET_ZONE_DEFAULT_MODULES,
  QR_QUIET_ZONE_MIN_MODULES,
  QR_VERSION_DIMENSION_BASE,
  QR_VERSION_DIMENSION_STEP,
  QR_VERSION_MAX,
  QR_VERSION_MIN,
} from "./constants.js";

/** Restrict SVG paints to opaque RGB hex values before adding them to markup. */
const OPAQUE_HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

/** Pixel dimensions used when the caller leaves `size` unset. */
const DEFAULT_SVG_SIZE_PX = 512;

/** One matrix module occupies one unit in the SVG viewBox. */
const QR_MODULE_UNIT = 1;

function isValidQrMatrix(matrix: QrMatrix): boolean {
  if (
    !matrix ||
    typeof matrix !== "object" ||
    !Number.isInteger(matrix.version) ||
    matrix.version < QR_VERSION_MIN ||
    matrix.version > QR_VERSION_MAX ||
    matrix.size !== matrix.version * QR_VERSION_DIMENSION_STEP + QR_VERSION_DIMENSION_BASE ||
    !ERROR_CORRECTION_LEVELS.some((level) => level === matrix.errorCorrectionLevel) ||
    !Array.isArray(matrix.modules) ||
    matrix.modules.length !== matrix.size
  ) {
    return false;
  }

  return matrix.modules.every(
    (row) =>
      Array.isArray(row) &&
      row.length === matrix.size &&
      row.every((cell) => typeof cell === "boolean"),
  );
}

/** Render the same SVG string for preview and export. No DOM or encoder calls. */
export function renderQrSvg(matrix: QrMatrix, options: RenderQrSvgOptions = {}): string {
  const {
    size = DEFAULT_SVG_SIZE_PX,
    quietZone = QR_QUIET_ZONE_DEFAULT_MODULES,
    foreground = "#000000",
    background = "#ffffff",
  } = options;

  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError("SVG size must be a positive safe integer.");
  }

  if (!Number.isSafeInteger(quietZone) || quietZone < QR_QUIET_ZONE_MIN_MODULES) {
    throw new RangeError(
      `Quiet zone must be an integer of at least ${QR_QUIET_ZONE_MIN_MODULES} modules.`,
    );
  }

  if (!OPAQUE_HEX_COLOR.test(foreground) || !OPAQUE_HEX_COLOR.test(background)) {
    throw new TypeError("SVG colors must use opaque #RGB or #RRGGBB notation.");
  }

  if (!isValidQrMatrix(matrix)) {
    throw new TypeError("Invalid QR matrix.");
  }

  const extent = matrix.size + quietZone * 2;

  if (!Number.isSafeInteger(extent)) {
    throw new RangeError("SVG viewBox exceeds safe integer dimensions.");
  }

  // Merge adjacent dark modules into horizontal runs to keep the SVG compact.
  const paths: string[] = [];

  for (const [y, row] of matrix.modules.entries()) {
    let x = 0;
    while (x < matrix.size) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < matrix.size && row[x]) x++;
      const width = x - start;
      paths.push(`M${start + quietZone} ${y + quietZone}h${width}v${QR_MODULE_UNIT}h-${width}z`);
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${extent} ${extent}">` +
    `<rect width="${extent}" height="${extent}" fill="${background}"/>` +
    `<path d="${paths.join("")}" fill="${foreground}"/>` +
    "</svg>"
  );
}
