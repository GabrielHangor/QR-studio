import { QrError } from "./errors.js";
import { isQrModuleShape, leafPath, SOFT_CORNER_RADIUS_RATIO } from "./shapes.js";
import { QR_FINDER_PATTERN_SIZE } from "./constants.js";
import type { QrFinderOptions, QrMatrix, QrModuleShape } from "./types.js";

/** A finder ring is one module thick and its pupil is inset by two modules. */
const FINDER_RING_WIDTH_MODULES = 1;
const FINDER_PUPIL_INSET_MODULES = 2;

/** Proportional corners preserve the nested appearance of rounded rings and pupils. */
const FINDER_CORNER_RADIUS_RATIO = 0.22;

/** Finder overrides accept the same passive opaque paint syntax as QR modules. */
const OPAQUE_HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

export function normalizeQrFinder(options: QrFinderOptions | undefined) {
  if (options === undefined) return undefined;
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new QrError("INVALID_FINDER_OPTIONS", {});
  }
  const outerShape = options.outerShape ?? "square";
  const innerShape = options.innerShape ?? outerShape;
  for (const shape of [outerShape, innerShape]) {
    if (!isQrModuleShape(shape)) {
      throw new QrError("INVALID_FINDER_SHAPE", {});
    }
  }
  for (const [target, color] of [
    ["finderRing", options.outerColor],
    ["finderPupil", options.innerColor],
  ] as const) {
    if (color !== undefined && (typeof color !== "string" || !OPAQUE_HEX_COLOR.test(color))) {
      throw new QrError("INVALID_COLOR", { target });
    }
  }
  return { ...options, outerShape, innerShape };
}

export function renderQrFinders(
  matrix: QrMatrix,
  origin: number,
  finder: NonNullable<ReturnType<typeof normalizeQrFinder>>,
  foreground: string,
): string {
  return matrix.finderPatterns
    .map(({ x, y }) => {
      const left = x + origin;
      const top = y + origin;
      const outer = contour(left, top, QR_FINDER_PATTERN_SIZE, finder.outerShape);
      const hole = contour(
        left + FINDER_RING_WIDTH_MODULES,
        top + FINDER_RING_WIDTH_MODULES,
        QR_FINDER_PATTERN_SIZE - FINDER_RING_WIDTH_MODULES * 2,
        finder.outerShape,
      );
      const pupil = contour(
        left + FINDER_PUPIL_INSET_MODULES,
        top + FINDER_PUPIL_INSET_MODULES,
        QR_FINDER_PATTERN_SIZE - FINDER_PUPIL_INSET_MODULES * 2,
        finder.innerShape,
      );
      // An even-odd hole reveals the QR background without repainting adjacent modules.
      return (
        `<g data-qr-finder="true"><path d="${outer}${hole}" fill-rule="evenodd" fill="${finder.outerColor ?? foreground}"/>` +
        `<path d="${pupil}" fill="${finder.innerColor ?? foreground}"/></g>`
      );
    })
    .join("");
}

function contour(x: number, y: number, size: number, shape: QrModuleShape): string {
  if (shape === "leaf" || shape === "leaf-reverse") {
    return leafPath(x, y, size, shape === "leaf-reverse");
  }
  if (shape === "square") {
    return `M${formatCoordinate(x)} ${formatCoordinate(y)}h${size}v${size}h-${size}z`;
  }
  if (shape === "circle") {
    const radius = size / 2;
    return `M${formatCoordinate(x)} ${formatCoordinate(y + radius)}a${radius} ${radius} 0 1 0 ${size} 0a${radius} ${radius} 0 1 0 -${size} 0z`;
  }
  const radius = size * (shape === "soft" ? SOFT_CORNER_RADIUS_RATIO : FINDER_CORNER_RADIUS_RATIO);
  return (
    `M${formatCoordinate(x + radius)} ${formatCoordinate(y)}H${formatCoordinate(x + size - radius)}Q${formatCoordinate(x + size)} ${formatCoordinate(y)} ${formatCoordinate(x + size)} ${formatCoordinate(y + radius)}` +
    `V${formatCoordinate(y + size - radius)}Q${formatCoordinate(x + size)} ${formatCoordinate(y + size)} ${formatCoordinate(x + size - radius)} ${formatCoordinate(y + size)}` +
    `H${formatCoordinate(x + radius)}Q${formatCoordinate(x)} ${formatCoordinate(y + size)} ${formatCoordinate(x)} ${formatCoordinate(y + size - radius)}` +
    `V${formatCoordinate(y + radius)}Q${formatCoordinate(x)} ${formatCoordinate(y)} ${formatCoordinate(x + radius)} ${formatCoordinate(y)}z`
  );
}

function formatCoordinate(value: number): string {
  return Number(value.toFixed(4)).toString();
}
