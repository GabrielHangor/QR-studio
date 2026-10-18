import { onBeforeUnmount, ref, type Ref } from "vue";
import type { QrEditorState } from "../editor/index.js";
import { readQrLogo, QrBrowserError } from "./browser.js";

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
  async function upload(file: File) {
    const previous = state.value.design.logo;
    remove();
    const current = ++sequence;
    busy.value = true;
    try {
      const dataUri = await readQrLogo(file);
      if (current !== sequence) return;
      state.value = {
        ...state.value,
        design: {
          ...state.value.design,
          logo: {
            dataUri,
            clearBackground: previous?.clearBackground ?? true,
            widthModules: previous?.widthModules ?? 5,
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
      if (current === sequence) busy.value = false;
    }
  }
  return { busy, issue, upload, remove };
}
