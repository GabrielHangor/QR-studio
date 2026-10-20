import type { ERROR_CORRECTION_LEVELS } from "./constants.js";
import type { QrDiagnosticParams } from "./issues.js";

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

export type QrModuleShape = (typeof import("./shapes.js").QR_MODULE_SHAPES)[number];

/** Outer artwork silhouette; the encoded QR matrix always remains square. */
export type QrArtworkShape = "square" | "circle";

export interface QrFinderOptions {
  /** Whole 7-module outer ring, with a 5-module clear center. Defaults to square. */
  readonly outerShape?: QrModuleShape;
  /** Whole 3-module pupil. Defaults to the outer shape. */
  readonly innerShape?: QrModuleShape;
  /** Opaque hex overrides; omitted colors inherit the QR foreground. */
  readonly outerColor?: string;
  readonly innerColor?: string;
}

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
  /** Omit whole cells under the logo and padding. Defaults to true; false keeps the QR underneath. */
  readonly clearBackground?: boolean;
}

export interface QrCaptionOptions {
  readonly text: string;
  /** Place text outside the QR quiet zone. Defaults to bottom. */
  readonly position?: "top" | "bottom";
  /** Maximum output-pixel size, reduced to fit the available caption space. Defaults to 18. */
  readonly fontSize?: number;
  readonly fontWeight?: 400 | 500 | 600 | 700;
  /** Output pixels between characters, from 0 to 10; scales down with fitted text. */
  readonly letterSpacing?: number;
  readonly color?: string;
  readonly background?: string;
  /** Arc follows the circular artwork; banner places a solid band behind straight text. */
  readonly style?: "plain" | "banner" | "arc";
}

export interface QrFrameOptions {
  readonly style?: "none" | "outline" | "dashed";
  /** Opaque RGB hex stroke. Defaults to the solid foreground or black. */
  readonly color?: string;
  /** Output-pixel stroke width, less than a quarter of artwork width. Defaults to 2. */
  readonly widthPx?: number;
}

export interface RenderQrSvgOptions {
  /** Full artwork width in pixels. Defaults to 512; straight captions extend output height. */
  size?: number;
  /** Clear border in modules, at least 4. Defaults to 4. */
  quietZone?: number;
  /** Opaque #RGB or #RRGGBB color, or a two-stop linear gradient. */
  foreground?: string | QrLinearGradient;
  /** Opaque #RGB or #RRGGBB color. Defaults to #ffffff. */
  background?: string;
  /** Outer artwork color; the full QR quiet-zone square keeps background. */
  artworkBackground?: string;
  /** Outer background and frame shape. Defaults to square; circle has transparent corners. */
  shape?: QrArtworkShape;
  /** Shape used for data modules. Function modules remain square for safety. */
  moduleShape?: QrModuleShape;
  /** Shape used for modules inside the three finder patterns. Defaults to square. */
  finderShape?: QrModuleShape;
  /** Style the three finder markers as whole rings and pupils. Overrides finderShape. */
  finder?: QrFinderOptions;
  /** Optional centered image; clearBackground removes whole modules underneath. */
  logo?: QrLogoOptions;
  /** One label, or up to two labels: one above and one below the symbol. */
  caption?: QrCaptionOptions | readonly QrCaptionOptions[];
  /** Draw a simple outline outside the required quiet zone. */
  frame?: "none" | "outline" | QrFrameOptions;
}

export type QrDesignDiagnosticCode = keyof QrDiagnosticParams;

export type QrDesignDiagnostic = {
  [C in QrDesignDiagnosticCode]: {
    readonly code: C;
    readonly severity: "warning" | "error";
    readonly params: Readonly<QrDiagnosticParams[C]>;
  };
}[QrDesignDiagnosticCode];

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
