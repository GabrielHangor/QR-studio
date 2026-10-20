import type { QrModuleShape } from "./types.js";

/** Softer corners keep more dark area than a separate circular dot. */
export const SOFT_CORNER_RADIUS_RATIO = 0.42;

export const QR_MODULE_SHAPES = [
  "square",
  "rounded",
  "circle",
  "soft",
  "leaf",
  "leaf-reverse",
  "classy",
  "classy-reverse",
  "rounded-top",
  "rounded-bottom",
] as const;
export function isQrModuleShape(shape: string): shape is QrModuleShape {
  return QR_MODULE_SHAPES.some((value) => value === shape);
}

const CORNER_MASKS: Partial<Record<QrModuleShape, readonly [number, number, number, number]>> = {
  "classy": [0, 1, 1, 1],
  "classy-reverse": [1, 1, 0, 1],
  "rounded-top": [1, 1, 0, 0],
  "rounded-bottom": [0, 0, 1, 1],
};

/** Per-corner radii, clockwise from top left; all paths stay inside the cell. */
export function cornerShapePath(
  x: number,
  y: number,
  size: number,
  shape: QrModuleShape,
): string | undefined {
  const corners = CORNER_MASKS[shape];
  if (!corners) return undefined;
  const [tl, tr, br, bl] = corners.map((corner) => (corner * size) / 2) as [
    number,
    number,
    number,
    number,
  ];
  const n = (value: number) => Number(value.toFixed(4));
  return `M${n(x + tl)} ${n(y)}H${n(x + size - tr)}Q${n(x + size)} ${n(y)} ${n(x + size)} ${n(y + tr)}V${n(y + size - br)}Q${n(x + size)} ${n(y + size)} ${n(x + size - br)} ${n(y + size)}H${n(x + bl)}Q${n(x)} ${n(y + size)} ${n(x)} ${n(y + size - bl)}V${n(y + tl)}Q${n(x)} ${n(y)} ${n(x + tl)} ${n(y)}z`;
}

/** Two opposite round corners produce a leaf without reducing the cell's bounding box. */
export function leafPath(x: number, y: number, size: number, reversed: boolean): string {
  const radius = size / 2;
  const n = (value: number) => Number(value.toFixed(4));
  return reversed
    ? `M${n(x)} ${n(y)}h${n(radius)}q${n(radius)} 0 ${n(radius)} ${n(radius)}v${n(radius)}h-${n(radius)}q-${n(radius)} 0 -${n(radius)} -${n(radius)}z`
    : `M${n(x + radius)} ${n(y)}h${n(radius)}v${n(radius)}q0 ${n(radius)} -${n(radius)} ${n(radius)}H${n(x)}v-${n(radius)}q0 -${n(radius)} ${n(radius)} -${n(radius)}z`;
}
