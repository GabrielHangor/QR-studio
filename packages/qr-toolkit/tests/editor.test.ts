import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createQrEditorState, resolveQrEditorContent } from "../src/editor/index.js";
import { useQrEditor } from "../src/ui/useQrEditor.js";
import { formatQrError } from "../src/i18n/index.js";
import { qrEditorMessagesRu, qrEditorMessagesEn } from "../src/ui/messages.js";

describe("editor content boundary", () => {
  it.each(["https://example.com", "http://example.com/path", "https://пример.рф/Привет?q=🙂"])(
    "preserves a valid URL: %s",
    (url) => {
      expect(resolveQrEditorContent("url", `  ${url}  `)).toEqual({
        status: "valid",
        payload: url,
      });
    },
  );
  it.each(["example.com", "https://", "javascript:alert(1)", "ftp://example.com", "not a URL"])(
    "rejects incomplete and unsupported URLs: %s",
    (value) => {
      expect(resolveQrEditorContent("url", value)).toEqual({
        status: "invalid",
        code: "INVALID_URL",
      });
    },
  );
  it.each(["  Привет 👋\nВторая строка  ", "   ", "\n"])("preserves text exactly: %j", (text) => {
    expect(resolveQrEditorContent("text", text)).toEqual({ status: "valid", payload: text });
  });
  it("distinguishes empty drafts", () => {
    expect(resolveQrEditorContent("url", "   ")).toEqual({ status: "empty" });
    expect(resolveQrEditorContent("text", "")).toEqual({ status: "empty" });
  });
  it("never shares mutable defaults between editors", () => {
    const first = createQrEditorState();
    first.design.background = "#abcdef";
    first.encoding.version = 1;
    expect(createQrEditorState()).toEqual({
      contentType: "url",
      url: "https://example.com",
      text: "QR Studio",
      encoding: { errorCorrectionLevel: "M" },
      design: { size: 512, quietZone: 4, foreground: "#202833", finder: { outerShape: "square" } },
    });
  });
});

describe("reactive editor pipeline", () => {
  it("clears a ready preview on invalid input and recovers", () => {
    const state = ref(createQrEditorState());
    const { preview } = useQrEditor(state);
    expect(preview.value.status).toBe("ready");
    state.value.url = "https://";
    expect(preview.value).toEqual({ status: "invalid", code: "INVALID_URL" });
    expect(preview.value).not.toHaveProperty("svg");
    state.value.url = "https://example.org";
    expect(preview.value.status).toBe("ready");
    state.value.url = "";
    expect(preview.value).toEqual({ status: "empty" });
  });
  it("keeps drafts and reuses the matrix when only the design changes", () => {
    const state = ref({ ...createQrEditorState(), url: "https://example.com", text: "Привет\n🙂" });
    const { preview } = useQrEditor(state);
    const initial = preview.value;
    expect(initial.status).toBe("ready");
    state.value = { ...state.value, design: { foreground: "#663399", moduleShape: "rounded" } };
    const styled = preview.value;
    if (initial.status !== "ready" || styled.status !== "ready") {
      throw new Error("Expected preview");
    }
    expect(styled.matrix).toBe(initial.matrix);
    expect(styled.svg).not.toBe(initial.svg);
    expect(styled.analysis.diagnostics.length).toBeGreaterThan(0);
    state.value.contentType = "text";
    expect(preview.value.status).toBe("ready");
    expect(state.value.url).toBe("https://example.com");
    state.value.contentType = "url";
    expect(state.value.text).toBe("Привет\n🙂");
  });
  it("clears stale SVG for renderer failures and exposes localized engine errors", () => {
    const state = ref({ ...createQrEditorState(), url: "https://example.com" });
    const { preview } = useQrEditor(state);
    expect(preview.value.status).toBe("ready");
    state.value.design.foreground = "invalid";
    const failed = preview.value;
    expect(failed.status).toBe("error");
    expect(failed).not.toHaveProperty("svg");
    if (failed.status !== "error") throw new Error("Expected an error");
    expect(formatQrError(failed.error, qrEditorMessagesRu.engine)).toContain("цвет модулей");
    expect(formatQrError(failed.error, qrEditorMessagesEn.engine)).not.toEqual(
      formatQrError(failed.error, qrEditorMessagesRu.engine),
    );
    state.value.design.foreground = "#000000";
    expect(preview.value.status).toBe("ready");
  });
  it("handles capacity overflow and subsequent recovery", () => {
    const state = ref({
      ...createQrEditorState(),
      contentType: "text" as const,
      text: "x".repeat(5000),
    });
    const { preview } = useQrEditor(state);
    expect(preview.value.status).toBe("error");
    expect(preview.value).not.toHaveProperty("svg");
    state.value.text = "Back to normal";
    expect(preview.value.status).toBe("ready");
  });
});
