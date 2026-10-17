import type {
  EncodeQrOptions,
  RenderQrSvgOptions,
  QrArtworkShape,
  QrCaptionOptions,
} from "../engine/types.js";

export type QrContentType = "url" | "text";

/** Drafts are independent: switching modes never discards the other input. */
export interface QrEditorState {
  contentType: QrContentType;
  url: string;
  text: string;
  encoding: EncodeQrOptions;
  design: RenderQrSvgOptions;
}

export function createQrEditorState(): QrEditorState {
  return { contentType: "url", url: "", text: "", encoding: {}, design: {} };
}

export type QrEditorContent =
  | { status: "empty" }
  | { status: "invalid"; code: "INVALID_URL" }
  | { status: "valid"; payload: string };

/** Only URL boundary whitespace is removed; text and valid URL spelling stay verbatim. */
export function resolveQrEditorContent(type: QrContentType, value: string): QrEditorContent {
  const payload = type === "url" ? value.trim() : value;
  if (!payload.length) return { status: "empty" };
  if (type === "text") return { status: "valid", payload };
  try {
    const url = new URL(payload);
    if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname) {
      return { status: "valid", payload };
    }
  } catch {
    // A URL draft is expected to be incomplete while the user is typing.
  }
  return { status: "invalid", code: "INVALID_URL" };
}

/** Catalogs are supplied by the host; presets never replace content or encoding. */
export interface QrDesignPreset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly design: Omit<RenderQrSvgOptions, "size" | "quietZone" | "logo">;
}
export interface QrEditorExample {
  readonly id: string;
  readonly title: string;
  readonly contentType: QrContentType;
  readonly value: string;
  readonly version?: number;
}

export function qrCaptionDrafts(design: RenderQrSvgOptions): readonly QrCaptionOptions[] {
  return design.caption === undefined
    ? []
    : Array.isArray(design.caption)
      ? design.caption
      : [design.caption as QrCaptionOptions];
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
