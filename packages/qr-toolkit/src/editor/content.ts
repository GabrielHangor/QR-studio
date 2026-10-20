import * as v from "valibot";

import { qrContentSchemas } from "./validation.js";

/** Static payloads are serialized locally; switching types preserves each draft. */
export const QR_CONTENT_TYPES = [
  "url",
  "text",
  "email",
  "phone",
  "sms",
  "wifi",
  "contact",
  "location",
] as const;
export type QrContentType = (typeof QR_CONTENT_TYPES)[number];
export type QrStructuredContentType = Exclude<QrContentType, "url" | "text">;
export type QrContentField =
  | "email"
  | "subject"
  | "body"
  | "phone"
  | "ssid"
  | "password"
  | "security"
  | "hidden"
  | "name"
  | "organization"
  | "latitude"
  | "longitude";
export type QrContentDraft = Partial<Record<QrContentField, string>>;
export type QrContentDrafts = Partial<Record<QrStructuredContentType, QrContentDraft>>;
export type QrEditorContent =
  | { status: "empty" }
  | { status: "invalid"; code: "INVALID_URL" | "INVALID_CONTENT" }
  | { status: "valid"; payload: string };

const phoneValue = (value: string) => value.replace(/[ ().-]/g, "");
const escapeWifi = (value: string) => value.replace(/[\\;,:"']/g, "\\$&");
const escapeCard = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[;,]/g, "\\$&");

export function resolveQrStructuredContent(
  type: QrStructuredContentType,
  draft: QrContentDraft = {},
): QrEditorContent {
  const valid = (payload: string): QrEditorContent => ({ status: "valid", payload });
  const invalid: QrEditorContent = { status: "invalid", code: "INVALID_CONTENT" };
  if (!Object.values(draft).some((value) => value?.trim())) return { status: "empty" };
  const parsed = v.safeParse(qrContentSchemas[type], draft);
  if (!parsed.success) return invalid;
  const values = parsed.output as Record<string, string | number>;
  const field = (key: QrContentField) => String(values[key] ?? "").trim();
  switch (type) {
    case "email": {
      const email = field("email");
      const query = (["subject", "body"] as const)
        .filter((key) => draft[key])
        .map((key) => `${key}=${encodeURIComponent(draft[key]!)}`)
        .join("&");
      return valid(
        `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}${query ? `?${query}` : ""}`,
      );
    }
    case "phone":
    case "sms": {
      const number = phoneValue(field("phone"));
      return valid(
        type === "phone"
          ? `tel:${number}`
          : `sms:${number}${draft.body ? `?body=${encodeURIComponent(draft.body)}` : ""}`,
      );
    }
    case "wifi": {
      const security = draft.security ?? "WPA";
      return valid(
        `WIFI:T:${security};S:${escapeWifi(draft.ssid!)};${security === "nopass" ? "" : `P:${escapeWifi(draft.password!)};`}H:${draft.hidden === "true"};;`,
      );
    }
    case "contact": {
      return valid(
        [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `N:;${escapeCard(field("name"))};;;`,
          `FN:${escapeCard(field("name"))}`,
          ...(field("organization") ? [`ORG:${escapeCard(field("organization"))}`] : []),
          ...(field("phone") ? [`TEL:${phoneValue(field("phone"))}`] : []),
          ...(field("email") ? [`EMAIL:${escapeCard(field("email"))}`] : []),
          "END:VCARD",
        ].join("\r\n"),
      );
    }
    case "location": {
      const latitude = Number(field("latitude"));
      const longitude = Number(field("longitude"));
      return valid(`geo:${latitude},${longitude}`);
    }
  }
}
