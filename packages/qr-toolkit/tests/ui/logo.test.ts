import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { createQrEditorState } from "../../src/editor/index.js";
import { useQrLogo } from "../../src/ui/useQrLogo.js";

const mocks = vi.hoisted(() => ({
  read: vi.fn<(file: File) => Promise<string>>(),
  select: vi.fn<(source: string) => Promise<string>>(),
  unmount: vi.fn<(callback: () => void) => void>(),
}));
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onBeforeUnmount: mocks.unmount,
}));
vi.mock("../../src/ui/browser.js", async (original) => ({
  ...(await original<typeof import("../../src/ui/browser.js")>()),
  readQrLogo: mocks.read,
  readQrLogoDataUri: mocks.select,
}));

beforeEach(() => vi.resetAllMocks());

function pendingRead() {
  let resolve!: (source: string) => void;
  const result = new Promise<string>((done) => {
    resolve = done;
  });
  return { result, resolve };
}

describe("logo selection and upload", () => {
  it("keeps the committed logo while decoding and preserves edits made during replacement", async () => {
    const state = ref(createQrEditorState());
    state.value.design.logo = { dataUri: "old", widthModules: 4 };
    const original = state.value.design.logo;
    const logo = useQrLogo(state);
    const pending = pendingRead();
    mocks.select.mockReturnValue(pending.result);
    const selection = logo.select("preset");
    expect(state.value.design.logo).toBe(original);
    expect(logo.busy.value).toBe(true);
    state.value.design.logo = { ...state.value.design.logo, widthModules: 3 };
    pending.resolve("preset");
    await selection;
    expect(state.value.design.logo).toMatchObject({ dataUri: "preset", widthModules: 3 });
    expect(logo.busy.value).toBe(false);
  });

  it("keeps the committed logo when a replacement fails and reports the failure", async () => {
    const state = ref(createQrEditorState());
    state.value.design.logo = { dataUri: "old", widthModules: 4 };
    const logo = useQrLogo(state);
    mocks.select.mockRejectedValue(new Error("Image decode failed"));
    await logo.select("broken");
    expect(state.value.design.logo).toMatchObject({ dataUri: "old", widthModules: 4 });
    expect(logo.issue.value).toBe("logoInvalid");
    expect(logo.busy.value).toBe(false);
  });

  it("preserves placement settings and content when selecting another raster", async () => {
    const state = ref(createQrEditorState());
    state.value.design.logo = {
      dataUri: "old",
      widthModules: 7,
      paddingModules: 1,
      clearBackground: false,
    };
    const logo = useQrLogo(state);
    mocks.select.mockResolvedValue("preset");
    await logo.select("preset");
    expect(state.value.design.logo).toEqual({
      dataUri: "preset",
      widthModules: 7,
      paddingModules: 1,
      clearBackground: false,
    });
    expect(state.value.url).toBe("https://example.com");
    expect(logo.busy.value).toBe(false);
    expect(logo.issue.value).toBeUndefined();
  });

  it("a gallery choice cancels a pending upload without losing placement settings", async () => {
    const state = ref(createQrEditorState());
    state.value.design.logo = { dataUri: "old", widthModules: 7, paddingModules: 1 };
    const logo = useQrLogo(state);
    const pending = pendingRead();
    mocks.read.mockReturnValue(pending.result);
    const upload = logo.upload({} as File);
    expect(logo.busy.value).toBe(true);
    expect(state.value.design.logo).toMatchObject({ dataUri: "old", widthModules: 7 });
    mocks.select.mockResolvedValue("preset");
    await logo.select("preset");
    pending.resolve("late upload");
    await upload;
    expect(state.value.design.logo).toMatchObject({
      dataUri: "preset",
      widthModules: 7,
      paddingModules: 1,
    });
    expect(logo.busy.value).toBe(false);
  });

  it("removing a pending choice prevents late results and resets placement for the next choice", async () => {
    const state = ref(createQrEditorState());
    state.value.design.logo = { dataUri: "old", widthModules: 9 };
    const logo = useQrLogo(state);
    const pending = pendingRead();
    mocks.select.mockReturnValueOnce(pending.result);
    const selection = logo.select("preset");
    logo.remove();
    pending.resolve("late preset");
    await selection;
    expect(state.value.design.logo).toBeUndefined();
    mocks.select.mockResolvedValue("new preset");
    await logo.select("new preset");
    expect(state.value.design.logo?.widthModules).toBe(4);
  });

  it("rejects a failed image without restoring stale preview data", async () => {
    const state = ref(createQrEditorState());
    const logo = useQrLogo(state);
    mocks.select.mockRejectedValue(new Error("Image decode failed"));
    await logo.select("broken preset");
    expect(state.value.design.logo).toBeUndefined();
    expect(logo.issue.value).toBe("logoInvalid");
    expect(logo.busy.value).toBe(false);
    logo.remove();
    expect(logo.issue.value).toBeUndefined();
  });

  it("ignores pending image data after the editor unmounts", async () => {
    const state = ref(createQrEditorState());
    const logo = useQrLogo(state);
    const pending = pendingRead();
    mocks.select.mockReturnValue(pending.result);
    const selection = logo.select("preset");
    mocks.unmount.mock.calls[0]![0]();
    pending.resolve("late preset");
    await selection;
    expect(state.value.design.logo).toBeUndefined();
  });
});
