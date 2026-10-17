<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UAlert from "@nuxt/ui/components/Alert.vue";
import { downloadQrBlob, qrPngBlob, scanQrSvg, QrBrowserError, SVG_MIME_TYPE } from "../browser.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";
const props = defineProps<{ preview: QrEditorPreview; messages: QrEditorMessages }>();
const svg = computed(() => (props.preview.status === "ready" ? props.preview.svg : undefined));
const url = ref<string>();
const busy = ref<"png" | "scan">();
const issue = ref<"exportFailed" | "exportTooLarge">();
const scan = ref<
  "scanMatched" | "scanMissing" | "scanMismatch" | "scanUnavailable" | "scanFailed"
>();
let sequence = 0;
function release() {
  if (url.value) URL.revokeObjectURL(url.value);
}
watch(
  svg,
  (value) => {
    sequence++;
    release();
    url.value =
      value && typeof window !== "undefined"
        ? URL.createObjectURL(new Blob([value], { type: SVG_MIME_TYPE }))
        : undefined;
    busy.value = undefined;
    issue.value = undefined;
    scan.value = undefined;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  sequence++;
  release();
});
function downloadSvg() {
  if (svg.value) downloadQrBlob(new Blob([svg.value], { type: SVG_MIME_TYPE }), "qr-studio.svg");
}
async function perform(operation: "png" | "scan") {
  if (props.preview.status !== "ready" || busy.value) return;
  const snapshot = props.preview;
  const current = ++sequence;
  busy.value = operation;
  issue.value = undefined;
  scan.value = undefined;
  try {
    if (operation === "png") {
      const blob = await qrPngBlob(snapshot.svg);
      if (current === sequence) downloadQrBlob(blob, "qr-studio.png");
    } else {
      const result = await scanQrSvg(snapshot.svg, snapshot.payload);
      if (current === sequence) scan.value = result;
    }
  } catch (error) {
    if (current !== sequence) return;
    if (operation === "scan") {
      scan.value =
        error instanceof QrBrowserError && error.code === "scanUnavailable"
          ? "scanUnavailable"
          : "scanFailed";
    } else {
      issue.value =
        error instanceof QrBrowserError && error.code === "exportTooLarge"
          ? "exportTooLarge"
          : "exportFailed";
    }
  } finally {
    if (current === sequence) busy.value = undefined;
  }
}
</script>
<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <UButton :label="messages.downloadSvg" :disabled="!svg" @click="downloadSvg" />
      <UButton
        :label="messages.downloadPng"
        :disabled="!svg || !!busy"
        :loading="busy === 'png'"
        @click="perform('png')"
      />
      <UButton
        v-if="url"
        :to="url"
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        :label="messages.openSvg"
      />
    </div>
    <UButton
      :label="messages.scan"
      :disabled="!svg || !!busy"
      :loading="busy === 'scan'"
      color="neutral"
      @click="perform('scan')"
    />
    <UAlert v-if="issue" color="error" :description="messages[issue]" role="alert" />
    <p v-if="scan" class="text-sm text-muted" role="status">{{ messages[scan] }}</p>
  </div>
</template>
