import { ERROR_CORRECTION_LEVELS } from "./constants.js";

/** Error correction levels; percentages are not safe logo-area allowances. */
export type ErrorCorrectionLevel = (typeof ERROR_CORRECTION_LEVELS)[number];

export interface EncodeQrOptions {
  errorCorrectionLevel?: ErrorCorrectionLevel;
  /** Omit to select the smallest version that fits the payload. */
  version?: number;
}

/** Borderless QR symbol. Coordinates are modules, indexed as modules[row][column]. */
export interface QrMatrix {
  readonly size: number;
  readonly version: number;
  readonly errorCorrectionLevel: ErrorCorrectionLevel;
  readonly modules: readonly (readonly boolean[])[];
}

export interface RenderQrSvgOptions {
  /** Square output dimensions in pixels. Defaults to 512. */
  size?: number;
  /** Clear border in modules, at least 4. Defaults to 4. */
  quietZone?: number;
  /** Opaque #RGB or #RRGGBB color. Defaults to #000000. */
  foreground?: string;
  /** Opaque #RGB or #RRGGBB color. Defaults to #ffffff. */
  background?: string;
}
