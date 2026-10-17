import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { resolveQrEditorContent, type QrEditorState } from "../editor/index.js";
import { encodeQr, renderQrSvg, analyzeQrDesign } from "../engine/index.js";
import type { QrMatrix, QrDesignAnalysis } from "../engine/types.js";

type EncodedResult =
  | { status: "empty" }
  | { status: "invalid"; code: "INVALID_URL" }
  | { status: "error"; error: unknown }
  | { status: "encoded"; matrix: QrMatrix };

export type QrEditorPreview =
  | Exclude<EncodedResult, { status: "encoded" }>
  | {
      status: "ready";
      svg: string;
      matrix: QrMatrix;
      analysis: QrDesignAnalysis;
    };

/** Vue orchestration only; encoder/renderer have no knowledge of editor state. */
export function useQrEditor(state: MaybeRefOrGetter<QrEditorState>) {
  const contentType = computed(() => toValue(state).contentType);
  const draft = computed(() => toValue(state)[contentType.value]);
  const encoding = computed(() => toValue(state).encoding);
  const design = computed(() => toValue(state).design);
  const content = computed(() => resolveQrEditorContent(contentType.value, draft.value));
  // Styling changes render the same matrix, without encoding the payload again.
  const encoded = computed<EncodedResult>(() => {
    if (content.value.status !== "valid") return content.value;
    try {
      return { status: "encoded", matrix: encodeQr(content.value.payload, encoding.value) };
    } catch (error) {
      return { status: "error", error };
    }
  });
  const preview = computed<QrEditorPreview>(() => {
    if (encoded.value.status !== "encoded") return encoded.value;
    try {
      const matrix = encoded.value.matrix;
      return {
        status: "ready",
        svg: renderQrSvg(matrix, design.value),
        matrix,
        analysis: analyzeQrDesign(matrix, design.value),
      };
    } catch (error) {
      // No cached SVG survives a failed generation or invalid design.
      return { status: "error", error };
    }
  });
  return { preview };
}
