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
  /** True for finder, separator, alignment, timing, format, and version cells. */
  readonly functionModules: readonly (readonly boolean[])[];
  /** Top-left module coordinates of the three 7 × 7 finder patterns. */
  readonly finderPatterns: readonly QrFinderPattern[];
}

export interface QrFinderPattern {
  readonly x: number;
  readonly y: number;
}

export type QrModuleShape = "square" | "rounded" | "circle";

export interface QrLinearGradient {
  readonly type: "linear";
  readonly direction: "horizontal" | "vertical" | "diagonal";
  readonly startColor: string;
  readonly endColor: string;
}

export interface QrLogoOptions {
  /** Base64 PNG, JPEG, or WebP data URI. SVG data URIs are intentionally excluded. */
  readonly dataUri: string;
  /** Centered square logo width, measured in QR modules. */
  readonly widthModules: number;
  /** Clear background padding around the logo, measured in QR modules. */
  readonly paddingModules?: number;
}

export interface QrCaptionOptions {
  readonly text: string;
  readonly color?: string;
  readonly background?: string;
  /** A banner places a solid band behind the text. */
  readonly style?: "plain" | "banner";
}

export interface RenderQrSvgOptions {
  /** QR artwork width in pixels. Defaults to 512; a caption extends output height. */
  size?: number;
  /** Clear border in modules, at least 4. Defaults to 4. */
  quietZone?: number;
  /** Opaque #RGB or #RRGGBB color, or a two-stop linear gradient. */
  foreground?: string | QrLinearGradient;
  /** Opaque #RGB or #RRGGBB color. Defaults to #ffffff. */
  background?: string;
  /** Shape used for data modules. Function modules remain square for safety. */
  moduleShape?: QrModuleShape;
  /** Shape used for modules inside the three finder patterns. Defaults to square. */
  finderShape?: QrModuleShape;
  /** Optional centered image overlay with a solid knockout behind it. */
  logo?: QrLogoOptions;
  /** Optional label below the symbol. */
  caption?: QrCaptionOptions;
  /** Draw a simple outline outside the required quiet zone. */
  frame?: "none" | "outline";
}

export type QrDesignDiagnosticCode =
  | "QUIET_ZONE_TOO_SMALL"
  | "CONTRAST_BELOW_THRESHOLD"
  | "MODULE_PITCH_BELOW_THRESHOLD"
  | "FOREGROUND_NOT_DARKER"
  | "GRADIENT_REQUIRES_DEVICE_TEST"
  | "MODULE_SHAPE_REQUIRES_DEVICE_TEST"
  | "FINDER_SHAPE_REQUIRES_DEVICE_TEST"
  | "LOGO_REDUCES_ERROR_CORRECTION"
  | "LOGO_OVERLAPS_FUNCTION_MODULES";

export interface QrDesignDiagnostic {
  readonly code: QrDesignDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
}

export interface AnalyzeQrDesignOptions {
  /** Optional measured threshold; the engine does not assume an unverified ratio. */
  readonly minimumContrastRatio?: number;
  /** Optional device-tested minimum module pitch in output pixels. */
  readonly minimumModulePitchPx?: number;
}

export interface QrDesignAnalysis {
  /** Luminance ratio for solid foregrounds; null for gradients. */
  readonly contrastRatio: number | null;
  /** Width of one QR module at the requested SVG output size. */
  readonly modulePitchPx: number;
  /** Geometric percentage of symbol area covered by logo plus its knockout. */
  readonly logoCoveragePercent: number | null;
  readonly diagnostics: readonly QrDesignDiagnostic[];
}
