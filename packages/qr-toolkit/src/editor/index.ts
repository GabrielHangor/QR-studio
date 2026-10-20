import * as v from "valibot";

import type {
  EncodeQrOptions,
  RenderQrSvgOptions,
  QrArtworkShape,
  QrCaptionOptions,
} from "../engine/types.js";
import {
  resolveQrStructuredContent,
  type QrContentType,
  type QrContentDrafts,
  type QrEditorContent,
} from "./content.js";
import { qrContentSchemas } from "./validation.js";
export { qrContentSchemas, qrContentFieldIssues } from "./validation.js";
export type { QrContentIssueCode } from "./validation.js";
export { QR_CONTENT_TYPES, resolveQrStructuredContent } from "./content.js";
export type {
  QrContentType,
  QrContentDrafts,
  QrContentDraft,
  QrContentField,
  QrStructuredContentType,
  QrEditorContent,
} from "./content.js";

/** Drafts are independent: switching modes never discards the other input. */
export interface QrEditorState {
  contentType: QrContentType;
  url: string;
  text: string;
  /** Optional for compatibility with previously saved URL/text states. */
  contentDrafts?: QrContentDrafts;
  encoding: EncodeQrOptions;
  design: RenderQrSvgOptions;
}

export function createQrEditorState(): QrEditorState {
  return {
    contentType: "url",
    url: "https://example.com",
    text: "QR Studio",
    contentDrafts: {
      email: { email: "hello@example.com", subject: "Привет из QR Studio", body: "Здравствуйте!" },
      phone: { phone: "+7 (999) 123-45-67" },
      sms: { phone: "+7 (999) 123-45-67", body: "Привет из QR Studio!" },
      wifi: {
        ssid: "QR Studio Guest",
        security: "WPA",
        password: "qr-studio-demo",
        hidden: "false",
      },
      contact: {
        name: "Анна Смирнова",
        organization: "QR Studio",
        phone: "+7 (999) 123-45-67",
        email: "anna@example.com",
      },
      location: { latitude: "55.7558", longitude: "37.6173" },
    },
    encoding: { errorCorrectionLevel: "M" },
    design: { size: 512, quietZone: 4, foreground: "#202833", finder: { outerShape: "square" } },
  };
}

/** Only URL boundary whitespace is removed; text and valid URL spelling stay verbatim. */
export function resolveQrEditorContent(type: "url" | "text", value: string): QrEditorContent {
  const payload = type === "url" ? value.trim() : value;
  if (!payload.length) return { status: "empty" };
  if (type === "text" && v.safeParse(qrContentSchemas.text, { text: payload }).success) {
    return { status: "valid", payload };
  }
  const parsed = v.safeParse(qrContentSchemas.url, { url: payload });
  if (parsed.success) return { status: "valid", payload };
  return { status: "invalid", code: "INVALID_URL" };
}

export function resolveQrEditorStateContent(state: QrEditorState): QrEditorContent {
  const type = state.contentType;
  return type === "url" || type === "text"
    ? resolveQrEditorContent(type, state[type])
    : resolveQrStructuredContent(type, state.contentDrafts?.[type]);
}

/** Catalogs are supplied by the host; presets never replace content or encoding. */
export interface QrDesignPreset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly design: Omit<RenderQrSvgOptions, "size" | "quietZone" | "logo">;
}
export function qrCaptionDrafts(design: RenderQrSvgOptions): readonly QrCaptionOptions[] {
  if (design.caption === undefined) return [];
  if (Array.isArray(design.caption)) return design.caption;
  return [design.caption as QrCaptionOptions];
}

/** Blank caption drafts retain their controls but are omitted from renderer input. */
export function qrEditorRenderOptions(design: RenderQrSvgOptions): RenderQrSvgOptions {
  return {
    ...design,
    caption: qrCaptionDrafts(design).filter(
      (caption) => typeof caption?.text !== "string" || caption.text.trim().length > 0,
    ),
  };
}

export function updateQrCaption(
  design: RenderQrSvgOptions,
  position: "top" | "bottom",
  patch: Partial<QrCaptionOptions>,
): RenderQrSvgOptions {
  const captions = qrCaptionDrafts(design);
  const current = captions.find((caption) => (caption.position ?? "bottom") === position);
  return {
    ...design,
    caption: [
      ...captions.filter((caption) => (caption.position ?? "bottom") !== position),
      { text: "", ...current, ...patch, position },
    ],
  };
}

export function changeQrArtworkShape(
  design: RenderQrSvgOptions,
  shape: QrArtworkShape,
): RenderQrSvgOptions {
  return {
    ...design,
    shape,
    caption: qrCaptionDrafts(design).map((caption) =>
      shape === "square" && caption.style === "arc"
        ? Object.assign({}, caption, { style: "plain" as const })
        : caption,
    ),
  };
}

export function applyQrPreset(state: QrEditorState, preset: QrDesignPreset): QrEditorState {
  // Renderer options are plain data; copying prevents edits from changing the host's catalog.
  const style = JSON.parse(JSON.stringify(preset.design)) as QrDesignPreset["design"];
  return {
    ...state,
    design: {
      ...style,
      size: state.design.size,
      quietZone: state.design.quietZone,
      logo: state.design.logo,
    },
  };
}

export function qrStyleSignature(design: RenderQrSvgOptions): string {
  const { size: _size, quietZone: _quietZone, logo: _logo, ...style } = design;
  return JSON.stringify(style, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  });
}

export { fullEditorConfig, compactEditorConfig } from "./config.js";
export type {
  QrEditorConfig,
  QrEditorSection,
  QrEditorSectionId,
  QrEditorControls,
  QrEditorRange,
} from "./config.js";
