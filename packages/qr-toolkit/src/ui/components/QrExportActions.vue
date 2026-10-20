<script setup lang="ts">
import UAlert from "@nuxt/ui/components/Alert.vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import USlider from "@nuxt/ui/components/Slider.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import { downloadQrBlob, qrPngBlob, scanQrSvg, QrBrowserError, SVG_MIME_TYPE } from "../browser.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";
import QrFieldHelp from "./QrFieldHelp.vue";
const props = defineProps<{
  preview: QrEditorPreview;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
const svg = computed(() => (props.preview.status === "ready" ? props.preview.svg : undefined));
const sizes = [256, 512, 1024, 2048];
// Four fixed export resolutions; this is pixel count, not a scanability score.
const resolution = computed(() => {
  const current = props.design.size ?? 512;
  const index = sizes.findIndex((size) => size >= current);
  return index < 0 ? sizes.length - 1 : index;
});
const dimensions = computed(() => {
  const width = props.design.size ?? 512;
  if (props.preview.status !== "ready") return `${width} px`;
  // Captions can make the image taller than it is wide. Read the renderer's dimensions.
  const height = props.preview.svg.match(/^<svg[^>]* height="([\d.]+)"/)?.[1];
  return `${width} × ${height ? Math.round(Number(height)) : width} px`;
});
function changeResolution(value: number | undefined) {
  const size = value === undefined ? undefined : sizes[value];
  if (size !== undefined) emit("update:design", { ...props.design, size });
}
const busy = ref<"png" | "scan">();
const issue = ref<"exportFailed" | "exportTooLarge">();
const scan = ref<
  "scanMatched" | "scanMissing" | "scanMismatch" | "scanUnavailable" | "scanFailed"
>();
let sequence = 0;
watch(
  svg,
  () => {
    sequence++;
    busy.value = undefined;
    issue.value = undefined;
    scan.value = undefined;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  sequence++;
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
  <div class="space-y-2">
    <UFormField :label="messages.resolution">
      <template #hint>
        <QrFieldHelp
          :label="messages.resolution"
          :text="messages.resolutionHint"
          :action-label="messages.help"
        />
      </template>
      <USlider
        :model-value="resolution"
        :min="0"
        :max="sizes.length - 1"
        :step="1"
        :aria-label="messages.resolution"
        :aria-valuetext="dimensions"
        class="my-2"
        @update:model-value="changeResolution"
      />
      <div class="flex justify-between gap-2 text-xs text-muted">
        <span>{{ messages.smallerFile }}</span>
        <output :aria-label="messages.exportDimensions" class="font-medium text-highlighted">
          {{ dimensions }}
        </output>
        <span>{{ messages.moreDetail }}</span>
      </div>
    </UFormField>
    <p class="text-xs text-muted">{{ messages.vectorHint }}</p>
    <div class="flex flex-wrap gap-2">
      <UButton
        label="SVG"
        :aria-label="messages.downloadSvg"
        :disabled="!svg"
        @click="downloadSvg"
      />
      <UButton
        label="PNG"
        :aria-label="messages.downloadPng"
        :disabled="!svg || !!busy"
        :loading="busy === 'png'"
        @click="perform('png')"
      />
      <UButton
        :label="messages.scan"
        leading-icon="i-ri-check-line"
        :disabled="!svg || !!busy"
        :loading="busy === 'scan'"
        color="neutral"
        variant="ghost"
        @click="perform('scan')"
      />
    </div>
    <p class="text-xs text-muted">{{ messages.staticHint }}</p>
    <!-- Keep feedback space stable during scans, retries and long localized messages. -->
    <div class="h-16 space-y-1.5 overflow-y-auto" role="status">
      <UAlert v-if="issue" color="error" :description="messages[issue]" role="alert" />
      <UBadge
        v-if="scan === 'scanMatched'"
        color="success"
        variant="soft"
        :label="messages.scanSuccess"
      />
      <p v-if="scan" class="text-xs text-muted">
        {{ scan === "scanMatched" ? messages.scanDeviceHint : messages[scan] }}
      </p>
    </div>
  </div>
</template>
