import { describe, expect, it } from "vitest";
import { ref } from "vue";

import {
  createQrEditorState,
  QR_CONTENT_TYPES,
  qrContentFieldIssues,
  resolveQrStructuredContent,
  type QrContentDraft,
  type QrStructuredContentType,
} from "../src/editor/index.js";
import { useQrEditor } from "../src/ui/useQrEditor.js";

describe("static QR payloads", () => {
  it.each<{ type: QrStructuredContentType; draft: QrContentDraft; payload: string }>([
    {
      type: "email",
      draft: { email: "me@example.com", subject: "Привет & QR", body: "line 1\nline 2" },
      payload:
        "mailto:me@example.com?subject=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%26%20QR&body=line%201%0Aline%202",
    },
    { type: "phone", draft: { phone: "+7 (999) 123-45-67" }, payload: "tel:+79991234567" },
    {
      type: "sms",
      draft: { phone: "+79991234567", body: "Hi & bye" },
      payload: "sms:+79991234567?body=Hi%20%26%20bye",
    },
    {
      type: "wifi",
      draft: { ssid: " A;B ", password: "p:ass\\word", hidden: "true" },
      payload: "WIFI:T:WPA;S: A\\;B ;P:p\\:ass\\\\word;H:true;;",
    },
    {
      type: "wifi",
      draft: { ssid: "Open", security: "nopass", password: "old" },
      payload: "WIFI:T:nopass;S:Open;H:false;;",
    },
    { type: "location", draft: { latitude: "0", longitude: "-180" }, payload: "geo:0,-180" },
    {
      type: "contact",
      draft: {
        name: "Анна; QR",
        organization: "A,B\nTEL:bad",
        phone: "+7 (999) 123-45-67",
        email: "me@example.com",
      },
      payload:
        "BEGIN:VCARD\r\nVERSION:3.0\r\nN:;Анна\\; QR;;;\r\nFN:Анна\\; QR\r\nORG:A\\,B\\nTEL:bad\r\nTEL:+79991234567\r\nEMAIL:me@example.com\r\nEND:VCARD",
    },
  ])("serializes $type with escaping", ({ type, draft, payload }) => {
    expect(resolveQrStructuredContent(type, draft)).toEqual({ status: "valid", payload });
  });
  it.each<[QrStructuredContentType, QrContentDraft]>([
    ["email", { email: "bad" }],
    ["email", { email: "me@example.com\r\nBCC:other@example.com" }],
    ["phone", { phone: "tel:123" }],
    ["sms", { phone: "+123?body=bad" }],
    ["wifi", { ssid: "Secured" }],
    ["wifi", { ssid: "X", security: "unknown" }],
    ["contact", { name: "A", email: "bad" }],
    ["location", { latitude: "91", longitude: "0" }],
    ["location", { latitude: "0", longitude: "181" }],
    ["location", { latitude: "", longitude: "1" }],
    ["location", { latitude: "NaN", longitude: "1" }],
  ])("rejects malformed %s data", (type, draft) => {
    expect(resolveQrStructuredContent(type, draft)).toEqual({
      status: "invalid",
      code: "INVALID_CONTENT",
    });
  });
  it("keeps independent drafts and clears stale previews", () => {
    const state = ref(createQrEditorState());
    const { preview } = useQrEditor(state);
    state.value.contentType = "email";
    expect(preview.value.status).toBe("ready");
    state.value.contentDrafts = {};
    expect(preview.value.status).toBe("empty");
    state.value.contentDrafts = { email: { email: "me@example.com" }, phone: { phone: "+123" } };
    expect(preview.value).toMatchObject({ status: "ready", payload: "mailto:me@example.com" });
    state.value.contentType = "phone";
    expect(preview.value).toMatchObject({ status: "ready", payload: "tel:+123" });
    state.value.contentType = "email";
    expect(preview.value).toMatchObject({ status: "ready", payload: "mailto:me@example.com" });
    state.value.contentDrafts.email = { email: "bad" };
    expect(preview.value).toEqual({ status: "invalid", code: "INVALID_CONTENT" });
    state.value.contentType = "url";
    expect(preview.value).toMatchObject({ status: "ready", payload: "https://example.com" });
  });
});

describe("Valibot field validation and defaults", () => {
  it.each(QR_CONTENT_TYPES)("shows a preview for the %s sample", (contentType) => {
    const state = { ...createQrEditorState(), contentType };
    expect(useQrEditor(state).preview.value.status).toBe("ready");
  });
  it("assigns validation issues to the individual fields", () => {
    expect(qrContentFieldIssues("email", { email: "bad", subject: "line\nbreak" })).toEqual({
      email: "email",
      subject: "subject",
    });
    expect(qrContentFieldIssues("contact", { name: "A", email: "bad", phone: "bad" })).toEqual({
      email: "email",
      phone: "phone",
    });
    expect(qrContentFieldIssues("wifi", { ssid: "Guest" })).toEqual({ password: "required" });
    expect(qrContentFieldIssues("wifi", { ssid: "Guest", security: "nopass" })).toEqual({});
    expect(qrContentFieldIssues("location", { latitude: "91", longitude: "181" })).toEqual({
      latitude: "latitude",
      longitude: "longitude",
    });
    expect(qrContentFieldIssues("location", { latitude: "", longitude: "bad" })).toMatchObject({
      latitude: "required",
      longitude: "coordinate",
    });
  });
  it("normalizes decimal commas and rejects non-decimal coordinates", () => {
    expect(
      resolveQrStructuredContent("location", { latitude: "55,7558", longitude: "37,6173" }),
    ).toEqual({ status: "valid", payload: "geo:55.7558,37.6173" });
    expect(qrContentFieldIssues("location", { latitude: "0x10", longitude: "0" })).toEqual({
      latitude: "coordinate",
    });
  });
});
