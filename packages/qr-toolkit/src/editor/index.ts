import type { EncodeQrOptions, RenderQrSvgOptions } from "../engine/types.js";

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
