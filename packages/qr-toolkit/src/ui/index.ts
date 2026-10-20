export { default as QrEditor } from "./QrEditor.vue";
export { useQrEditor } from "./useQrEditor.js";
export type { QrEditorPreview } from "./useQrEditor.js";
export { qrEditorMessagesRu, qrEditorMessagesEn } from "./messages.js";
export type { QrEditorMessages } from "./messages.js";
export { createQrEditorState } from "../editor/index.js";
export type { QrEditorState, QrContentType } from "../editor/index.js";

export type { QrDesignPreset } from "../editor/index.js";

export type { QrLocationSearch, QrLocationSearchResult } from "./geocoding.js";

export { fullEditorConfig, compactEditorConfig } from "../editor/config.js";
export type {
  QrEditorConfig,
  QrEditorSection,
  QrEditorSectionId,
  QrEditorControls,
  QrEditorRange,
} from "../editor/config.js";
