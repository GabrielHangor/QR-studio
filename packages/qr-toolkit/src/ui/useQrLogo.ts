import { onBeforeUnmount, ref, type Ref } from "vue";

import type { QrEditorState } from "../editor/index.js";
import { readQrLogo, readQrLogoDataUri, QrBrowserError } from "./browser.js";

export function useQrLogo(state: Ref<QrEditorState>) {
  const busy = ref(false);
  const issue = ref<"logoFormat" | "logoTooLarge" | "logoInvalid">();
  let sequence = 0;
  onBeforeUnmount(() => {
    sequence++;
  });
  function remove() {
    sequence++;
    busy.value = false;
    issue.value = undefined;
    state.value = { ...state.value, design: { ...state.value.design, logo: undefined } };
  }
  async function apply(read: () => Promise<string>) {
    const current = ++sequence;
    issue.value = undefined;
    busy.value = true;
    try {
      const dataUri = await read();
      if (current !== sequence) return;
      // Keep the committed logo mounted until its replacement has decoded.
      const previous = state.value.design.logo;
      state.value = {
        ...state.value,
        design: {
          ...state.value.design,
          logo: {
            dataUri,
            clearBackground: previous?.clearBackground ?? true,
            widthModules: previous?.widthModules ?? 4,
            paddingModules: previous?.paddingModules ?? 0.5,
          },
        },
      };
    } catch (error) {
      if (current === sequence) {
        issue.value =
          error instanceof QrBrowserError &&
          (error.code === "logoFormat" || error.code === "logoTooLarge")
            ? error.code
            : "logoInvalid";
      }
    } finally {
      if (current === sequence) {
        busy.value = false;
      }
    }
  }
  function upload(file: File) {
    return apply(() => readQrLogo(file));
  }
  function select(dataUri: string) {
    return apply(() => readQrLogoDataUri(dataUri));
  }
  return { busy, issue, upload, select, remove };
}
