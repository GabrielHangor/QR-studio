import { QR_MODULE_SHAPES } from "../engine/shapes.js";
import type {
  ErrorCorrectionLevel,
  QrArtworkShape,
  QrCaptionOptions,
  QrModuleShape,
} from "../engine/types.js";
import { QR_CONTENT_TYPES, type QrContentType } from "./content.js";

export type QrEditorChoices<T> = readonly [T, ...T[]];
export interface QrEditorRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}
export interface QrEditorControls {
  content: "locationMap" | "locationSearch" | "sampleHint";
  presets: never;
  colors:
    | "fill"
    | "foreground"
    | "background"
    | "gradientEnd"
    | "outerColor"
    | "innerColor"
    | "artworkBackground"
    | "frameColor";
  shapes:
    | "moduleShape"
    | "finderOuter"
    | "finderInner"
    | "artworkShape"
    | "codeScale"
    | "frame"
    | "frameWidth";
  logo: "presets" | "upload" | "remove" | "clearBackground" | "size" | "padding";
  captions:
    | "top"
    | "bottom"
    | "text"
    | "style"
    | "fontSize"
    | "color"
    | "background"
    | "fontWeight"
    | "letterSpacing";
  technical: "ecc" | "quietZone";
}
export type QrEditorSectionId = keyof QrEditorControls;
export type QrEditorSection = {
  [K in QrEditorSectionId]: { readonly id: K; readonly controls: readonly QrEditorControls[K][] };
}[QrEditorSectionId];

/** UI capabilities only. State, provider services and engine validation are independent. */
export interface QrEditorConfig {
  readonly contentTypes: QrEditorChoices<QrContentType>;
  /** Array order is section order. Controls select visibility within each section. */
  readonly sections: readonly QrEditorSection[];
  readonly initialSection?: QrEditorSectionId;
  readonly choices: {
    readonly moduleShape: QrEditorChoices<QrModuleShape>;
    readonly finderOuter: QrEditorChoices<QrModuleShape>;
    readonly finderInner: QrEditorChoices<QrModuleShape>;
    readonly artworkShape: QrEditorChoices<QrArtworkShape>;
    readonly frameStyle: QrEditorChoices<"none" | "outline" | "dashed">;
    readonly fill: QrEditorChoices<"solid" | "horizontal" | "vertical" | "diagonal">;
    readonly ecc: QrEditorChoices<ErrorCorrectionLevel>;
    readonly captionStyle: QrEditorChoices<NonNullable<QrCaptionOptions["style"]>>;
    readonly fontWeight: QrEditorChoices<NonNullable<QrCaptionOptions["fontWeight"]>>;
  };
  readonly ranges: {
    readonly quietZone: QrEditorRange;
    readonly codeScale: QrEditorRange;
    readonly frameWidth: QrEditorRange;
    readonly logoSize: QrEditorRange;
    readonly logoPadding: QrEditorRange;
    readonly captionFontSize: QrEditorRange;
    readonly captionLetterSpacing: QrEditorRange;
    readonly captionTextMaxLength: number;
  };
  readonly palettes: {
    readonly foreground: readonly string[];
    readonly background: readonly string[];
  };
  readonly export: {
    readonly formats: readonly ("svg" | "png")[];
    readonly resolutions: QrEditorChoices<number>;
    readonly resolution: boolean;
    readonly scan: boolean;
  };
  readonly recommendations: boolean;
}

/** Ready-to-use configurations are chosen by the host, never by QrEditor. */
export const fullEditorConfig = {
  contentTypes: QR_CONTENT_TYPES,
  initialSection: "content",
  sections: [
    { id: "content", controls: ["locationMap", "locationSearch", "sampleHint"] },
    { id: "presets", controls: [] },
    {
      id: "colors",
      controls: [
        "fill",
        "foreground",
        "background",
        "gradientEnd",
        "outerColor",
        "innerColor",
        "artworkBackground",
        "frameColor",
      ],
    },
    {
      id: "shapes",
      controls: [
        "moduleShape",
        "finderOuter",
        "finderInner",
        "artworkShape",
        "codeScale",
        "frame",
        "frameWidth",
      ],
    },
    { id: "logo", controls: ["presets", "upload", "remove", "clearBackground", "size", "padding"] },
    {
      id: "captions",
      controls: [
        "top",
        "bottom",
        "text",
        "style",
        "fontSize",
        "color",
        "background",
        "fontWeight",
        "letterSpacing",
      ],
    },
    { id: "technical", controls: ["ecc", "quietZone"] },
  ],
  choices: {
    moduleShape: QR_MODULE_SHAPES,
    finderOuter: QR_MODULE_SHAPES,
    finderInner: QR_MODULE_SHAPES,
    artworkShape: ["square", "circle"],
    frameStyle: ["none", "outline", "dashed"],
    fill: ["solid", "horizontal", "vertical", "diagonal"],
    ecc: ["L", "M", "Q", "H"],
    captionStyle: ["plain", "banner", "arc"],
    fontWeight: [400, 500, 600, 700],
  },
  ranges: {
    quietZone: { min: 4, max: 12, step: 1 },
    codeScale: { min: 40, max: 200, step: 1 },
    frameWidth: { min: 0.5, max: 16, step: 0.5 },
    logoSize: { min: 1, max: 20, step: 0.5 },
    logoPadding: { min: 0, max: 8, step: 0.5 },
    captionFontSize: { min: 8, max: 48, step: 1 },
    captionLetterSpacing: { min: 0, max: 10, step: 0.25 },
    captionTextMaxLength: 80,
  },
  palettes: {
    foreground: [
      "#202833",
      "#173d51",
      "#1e40af",
      "#5b21b6",
      "#166534",
      "#115e59",
      "#9f1239",
      "#78350f",
    ],
    background: [
      "#ffffff",
      "#faf6ed",
      "#f1f5f9",
      "#f5f3ff",
      "#f0fdf4",
      "#fff7ed",
      "#fff1f2",
      "#e2e8f0",
    ],
  },
  export: {
    formats: ["svg", "png"],
    resolutions: [256, 512, 1024, 2048],
    resolution: true,
    scan: true,
  },
  recommendations: true,
} as const satisfies QrEditorConfig;

export const compactEditorConfig = {
  ...fullEditorConfig,
  contentTypes: ["url", "text"],
  sections: [
    { id: "content", controls: ["sampleHint"] },
    { id: "colors", controls: ["foreground", "background"] },
    { id: "shapes", controls: ["moduleShape"] },
  ],
  choices: { ...fullEditorConfig.choices, moduleShape: ["square", "rounded", "circle"] },
  export: { formats: ["svg", "png"], resolutions: [512, 1024], resolution: true, scan: false },
} as const satisfies QrEditorConfig;

export function qrSectionControls<K extends QrEditorSectionId>(
  config: QrEditorConfig,
  id: K,
): readonly QrEditorControls[K][] {
  return (config.sections.find((section) => section.id === id)?.controls ??
    []) as readonly QrEditorControls[K][];
}
