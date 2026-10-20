import { describe, expect, it } from "vitest";

import {
  applyQrPreset,
  changeQrArtworkShape,
  createQrEditorState,
  qrCaptionDrafts,
  qrEditorRenderOptions,
  qrStyleSignature,
  updateQrCaption,
  type QrDesignPreset,
} from "../src/editor/index.js";
import { encodeQr, renderQrSvg } from "../src/engine/index.js";

describe("editor design boundaries", () => {
  it("applies an external preset without changing content, encoding, logo or export parameters", () => {
    const state = createQrEditorState();
    state.url = "https://example.com/private";
    state.encoding = { version: 4, errorCorrectionLevel: "H" };
    state.design = {
      size: 1024,
      quietZone: 6,
      logo: { dataUri: "data:image/png;base64,AA==", widthModules: 5 },
      caption: { text: "Old" },
    };
    const preset: QrDesignPreset = {
      id: "external",
      title: "External",
      description: "From the host",
      design: {
        foreground: {
          type: "linear",
          direction: "horizontal",
          startColor: "#123456",
          endColor: "#234567",
        },
        finder: { outerShape: "circle" },
      },
    };
    const before = JSON.stringify(preset);
    const next = applyQrPreset(state, preset);
    expect(next.url).toBe(state.url);
    expect(next.encoding).toBe(state.encoding);
    expect(next.design.logo).toBe(state.design.logo);
    expect(next.design.size).toBe(1024);
    expect(next.design.quietZone).toBe(6);
    expect(next.design.caption).toBeUndefined();
    next.design.finder = { ...next.design.finder, outerShape: "square" };
    expect(JSON.stringify(preset)).toBe(before);
  });
  it("compares style independently of property order and export settings", () => {
    expect(qrStyleSignature({ foreground: "#123456", shape: "circle", size: 512 })).toBe(
      qrStyleSignature({ quietZone: 6, shape: "circle", foreground: "#123456", size: 2048 }),
    );
  });
  it("retains blank caption drafts without submitting them to the renderer", () => {
    const design = updateQrCaption({}, "top", { style: "banner", fontWeight: 700 });
    expect(qrCaptionDrafts(design)[0]?.fontWeight).toBe(700);
    expect(qrEditorRenderOptions(design).caption).toEqual([]);
    expect(renderQrSvg(encodeQr("QR"), qrEditorRenderOptions(design))).not.toContain("<text");
    const filled = updateQrCaption(design, "top", { text: "Hello" });
    expect(qrCaptionDrafts(filled)[0]?.fontWeight).toBe(700);
    expect(renderQrSvg(encodeQr("QR"), qrEditorRenderOptions(filled))).toContain("Hello");
  });
  it("updates captions independently and removes arc styling when switching to square", () => {
    let design = updateQrCaption({ shape: "circle" }, "top", {
      text: "Top",
      style: "arc",
      fontSize: 24,
    });
    design = updateQrCaption(design, "bottom", { text: "Bottom", style: "arc" });
    const before = JSON.stringify(design);
    const square = changeQrArtworkShape(design, "square");
    expect(qrCaptionDrafts(square).map(({ text, style }) => ({ text, style }))).toEqual([
      { text: "Top", style: "plain" },
      { text: "Bottom", style: "plain" },
    ]);
    expect(qrCaptionDrafts(square)[0]?.fontSize).toBe(24);
    expect(JSON.stringify(design)).toBe(before);
    expect(renderQrSvg(encodeQr("QR"), square)).not.toContain("<textPath");
  });
});
