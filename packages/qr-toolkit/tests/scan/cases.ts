import { editorLogoPresets } from "../../../../apps/frontend/src/logo-presets.js";
import { editorPresets } from "../../../../apps/frontend/src/presets.js";
import {
  createQrEditorState,
  resolveQrEditorStateContent,
  QR_CONTENT_TYPES,
} from "../../src/editor/index.js";
import type { EncodeQrOptions, RenderQrSvgOptions } from "../../src/engine/index.js";
import { designPresets } from "../fixtures/design-presets.js";

const example = createQrEditorState();
const sampleLogo = editorLogoPresets[0]!;
const defaultContents = QR_CONTENT_TYPES.map((contentType) => {
  const content = resolveQrEditorStateContent({ ...example, contentType });
  if (content.status !== "valid") throw new Error(`Invalid sample: ${contentType}`);
  return { id: contentType, payload: content.payload };
});

export interface ScanCase {
  readonly id: string;
  readonly payload: string;
  readonly encoding: EncodeQrOptions;
  readonly design: RenderQrSvgOptions;
  readonly effect?: "reduce" | "blur" | "jpeg";
  readonly logo?: true;
}

// Explicit fixtures, not random values: IDs reproduce the same payload and options on every run.
const payloads = [
  { id: "url", text: "https://example.com/qr?source=playground" },
  { id: "cyrillic", text: "QR Studio: Привет, мир!" },
  { id: "emoji", text: "Coffee ☕ · Привет 👋 🌍" },
  { id: "multiline", text: "Первая строка\nSecond line\nТретья строка" },
];

export const scanCases: readonly ScanCase[] = [
  ...defaultContents.flatMap((content) =>
    (["square", "circle"] as const).flatMap((shape) =>
      [256, 512].flatMap((size) =>
        [true, false].map((clearBackground) => ({
          id: `content-logo-${content.id}-${shape}-${size}-${clearBackground}`,
          payload: content.payload,
          encoding: example.encoding,
          design: {
            shape,
            size,
            logo: {
              dataUri: sampleLogo.dataUri,
              widthModules: 4,
              paddingModules: 0.5,
              clearBackground,
            },
          },
        })),
      ),
    ),
  ),
  ...[1, 2, 7, 10, 14, 27, 40].flatMap((version) =>
    [true, false].map((clearBackground) => ({
      id: `logo-placement-version-${version}-${clearBackground}`,
      payload: "QR",
      encoding: { version, errorCorrectionLevel: "M" as const },
      design: {
        size: 512,
        logo: {
          dataUri: sampleLogo.dataUri,
          widthModules: 4,
          paddingModules: 0.5,
          clearBackground,
        },
      },
    })),
  ),
  ...(["square", "circle"] as const).flatMap((shape) =>
    [40, 70, 100, 110, 10_000].flatMap((codeScale) =>
      [256, 512].map((size) => ({
        id: `scale-${shape}-${codeScale}-${size}`,
        payload: "QR Studio — масштабирование 👋",
        encoding: { errorCorrectionLevel: "M" as const },
        design: {
          shape,
          codeScale,
          size,
          foreground: "#16345b",
          background: "#ffffff",
          artworkBackground: "#eaf0fc",
          frame: { widthPx: 3 },
          caption: [
            {
              text: "QR STUDIO",
              position: "top" as const,
              style: shape === "circle" ? ("arc" as const) : ("plain" as const),
            },
            {
              text: "Подробнее",
              position: "bottom" as const,
              style: shape === "circle" ? ("arc" as const) : ("banner" as const),
            },
          ],
        },
      })),
    ),
  ),

  ...editorLogoPresets.flatMap((logo) =>
    (["square", "circle"] as const).flatMap((shape) =>
      [256, 512].map((size) => ({
        id: `logo-preset-${logo.id}-${shape}-${size}`,
        payload: "https://example.com/logos",
        encoding: { errorCorrectionLevel: "M" as const },
        design: {
          size,
          shape,
          logo: { dataUri: logo.dataUri, widthModules: 4, paddingModules: 0.5 },
        },
      })),
    ),
  ),
  ...designPresets.flatMap((preset) =>
    payloads.flatMap((payload) =>
      [256, 512].map((size) => ({
        id: `${preset.id}-${payload.id}-${size}`,
        payload: payload.text,
        encoding: { errorCorrectionLevel: "Q" as const },
        design: { ...preset.design, size },
      })),
    ),
  ),
  ...designPresets.flatMap((preset) =>
    (["reduce", "blur", "jpeg"] as const).map((effect) => ({
      id: `${preset.id}-${effect}`,
      payload: payloads[0]!.text,
      encoding: { errorCorrectionLevel: "Q" as const },
      design: { ...preset.design, size: 512 },
      effect,
    })),
  ),
  ...[1, 7, 10, 27, 40].flatMap((version) =>
    (["L", "M", "Q", "H"] as const).map((errorCorrectionLevel) => ({
      id: `version-${version}-${errorCorrectionLevel}`,
      // Fits even version 1 / H; this scenario checks version geometry, not overflow.
      payload: "QR",
      encoding: { version, errorCorrectionLevel },
      design: { size: 1024 },
    })),
  ),
  ...(["square", "rounded", "circle"] as const).flatMap((outerShape) =>
    (["square", "rounded", "circle"] as const).map((innerShape) => ({
      id: `finders-${outerShape}-${innerShape}`,
      payload: payloads[0]!.text,
      encoding: { errorCorrectionLevel: "M" as const },
      design: { size: 512, finder: { outerShape, innerShape } },
    })),
  ),
  {
    id: "long-unicode-1024",
    payload: "QR Studio — длинный текст, Unicode и переносы.\n".repeat(16),
    encoding: { errorCorrectionLevel: "M" },
    design: { size: 1024, moduleShape: "rounded" },
  },
  ...(["square", "circle"] as const).map((shape) => ({
    id: `logo-${shape}`,
    payload: "https://example.com",
    encoding: { version: 3, errorCorrectionLevel: "H" as const },
    design: { size: 512, shape, moduleShape: "rounded" as const },
    logo: true as const,
  })),
  ...editorPresets.flatMap((preset) =>
    [
      ...payloads,
      { id: "wifi", text: "WIFI:T:WPA;S:Studio Guest;P:welcome-2026;H:false;;" },
      {
        id: "contact",
        text: "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Анна Смирнова\r\nORG:QR Studio\r\nTEL:+79991234567\r\nEMAIL:anna@example.com\r\nEND:VCARD",
      },
    ].flatMap((payload) =>
      [256, 512].map((size) => ({
        id: `editor-${preset.id}-${payload.id}-${size}`,
        payload: payload.text,
        encoding: { errorCorrectionLevel: "M" as const },
        design: { ...preset.design, size },
      })),
    ),
  ),
  ...(["square", "rounded", "circle", "soft", "leaf", "leaf-reverse"] as const).flatMap(
    (moduleShape) =>
      [true, false].map((clearBackground) => ({
        id: `logo-clear-${moduleShape}-${clearBackground}`,
        payload: "https://example.com/logo",
        encoding: { version: 3, errorCorrectionLevel: "H" as const },
        design: {
          size: 512,
          moduleShape,
          logo: {
            // A transparent 1 × 1 PNG makes the cleared area observable to the decoder.
            dataUri:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
            widthModules: 3.5,
            paddingModules: 0.25,
            clearBackground,
          },
        },
      })),
  ),
  ...(
    [
      "soft",
      "leaf",
      "leaf-reverse",
      "classy",
      "classy-reverse",
      "rounded-top",
      "rounded-bottom",
    ] as const
  ).flatMap((shape) =>
    ["modules", "outer", "inner"].map((part) => ({
      id: `new-${part}-${shape}`,
      payload: "QR Studio — проверка 👋",
      encoding: { errorCorrectionLevel: "M" as const },
      design: {
        size: 512,
        ...(part === "modules"
          ? { moduleShape: shape }
          : {
              finder:
                part === "outer"
                  ? { outerShape: shape, innerShape: "square" as const }
                  : { outerShape: "square" as const, innerShape: shape },
            }),
      },
    })),
  ),
];
