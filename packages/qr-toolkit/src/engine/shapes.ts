import type { QrModuleShape } from "./types.js";

/** Softer corners keep more dark area than a separate circular dot. */
export const SOFT_CORNER_RADIUS_RATIO = 0.42;

export function isQrModuleShape(shape: string): shape is QrModuleShape {
  return ["square", "rounded", "circle", "soft", "leaf", "leaf-reverse"].includes(shape);
}

/** Two opposite round corners produce a leaf without reducing the cell's bounding box. */
export function leafPath(x: number, y: number, size: number, reversed: boolean): string {
  const radius = size / 2;
  const n = (value: number) => Number(value.toFixed(4));
  return reversed
    ? `M${n(x)} ${n(y)}h${n(radius)}q${n(radius)} 0 ${n(radius)} ${n(radius)}v${n(radius)}h-${n(radius)}q-${n(radius)} 0 -${n(radius)} -${n(radius)}z`
    : `M${n(x + radius)} ${n(y)}h${n(radius)}v${n(radius)}q0 ${n(radius)} -${n(radius)} ${n(radius)}H${n(x)}v-${n(radius)}q0 -${n(radius)} ${n(radius)} -${n(radius)}z`;
}
