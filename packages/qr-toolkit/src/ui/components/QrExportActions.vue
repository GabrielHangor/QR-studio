<script setup lang="ts">
import UAlert from "@nuxt/ui/components/Alert.vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UPopover from "@nuxt/ui/components/Popover.vue";
import USlider from "@nuxt/ui/components/Slider.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import type { QrEditorConfig } from "../../editor/config.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import { downloadQrBlob, qrPngBlob, scanQrSvg, QrBrowserError, SVG_MIME_TYPE } from "../browser.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";
import QrFieldHelp from "./QrFieldHelp.vue";
const props = defineProps<{
  preview: QrEditorPreview;
  disabled?: boolean;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig["export"];
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
const svg = computed(() => (props.preview.status === "ready" ? props.preview.svg : undefined));
const sizes = computed(() => props.config.resolutions);
// Available export resolutions are supplied by the host.
const resolution = computed(() => {
  const current = props.design.size ?? 512;
  const exact = sizes.value.indexOf(current);
  if (exact >= 0) return exact;
  const index = sizes.value.findIndex((size) => size >= current);
  return index < 0 ? sizes.value.length - 1 : index;
});
const dimensions = computed(() => {
  const width = props.design.size ?? 512;
  if (props.preview.status !== "ready") return `${width} ${props.messages.pixelUnit}`;
  // Captions can make the image taller than it is wide. Read the renderer's dimensions.
  const height = props.preview.svg.match(/^<svg[^>]* height="([\d.]+)"/)?.[1];
  return `${width} × ${height ? Math.round(Number(height)) : width} ${props.messages.pixelUnit}`;
});
function changeResolution(value: number | undefined) {
  const size = value === undefined ? undefined : sizes.value[value];
  if (size !== undefined) emit("update:design", { ...props.design, size });
}
const feedbackOpen = ref(false);
function preventFocus(event: Event) {
  event.preventDefault();
}
const busy = ref<"png" | "scan">();
const issue = ref<"exportFailed" | "exportTooLarge">();
const scan = ref<
  "scanMatched" | "scanMissing" | "scanMismatch" | "scanUnavailable" | "scanFailed"
>();
let sequence = 0;
watch(
  [svg, () => props.disabled],
  () => {
    sequence++;
    busy.value = undefined;
    issue.value = undefined;
    scan.value = undefined;
    feedbackOpen.value = false;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  sequence++;
});
function downloadSvg() {
  if (svg.value && !props.disabled) {
    downloadQrBlob(new Blob([svg.value], { type: SVG_MIME_TYPE }), "qr-studio.svg");
  }
}
async function perform(operation: "png" | "scan") {
  if (props.preview.status !== "ready" || props.disabled || busy.value) return;
  const snapshot = props.preview;
  const current = ++sequence;
  feedbackOpen.value = false;
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
    if (current === sequence) {
      busy.value = undefined;
      feedbackOpen.value = !!(issue.value || scan.value);
    }
  }
}
</script>
<template>
  <div class="space-y-2">
    <UFormField
      v-if="config.resolution && config.resolutions.length > 1"
      :label="messages.resolution"
    >
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
    <p v-if="config.formats.includes('svg')" class="text-xs text-muted">
      {{ messages.vectorHint }}
    </p>
    <UPopover
      v-model:open="feedbackOpen"
      :content="{
        side: 'top',
        align: 'end',
        onOpenAutoFocus: preventFocus,
        onCloseAutoFocus: preventFocus,
      }"
      :ui="{ content: 'relative w-80 max-w-[calc(100vw-2rem)] p-4' }"
    >
      <template #anchor>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="config.formats.includes('svg')"
            label="SVG"
            color="neutral"
            :aria-label="messages.downloadSvg"
            :disabled="disabled || !svg"
            @click="downloadSvg"
          />
          <UButton
            v-if="config.formats.includes('png')"
            label="PNG"
            color="primary"
            variant="solid"
            :aria-label="messages.downloadPng"
            :disabled="disabled || !svg || !!busy"
            :loading="busy === 'png'"
            @click="perform('png')"
          />
          <UButton
            v-if="config.scan"
            :label="messages.scan"
            leading-icon="i-ri-check-line"
            :disabled="disabled || !svg || !!busy"
            :loading="busy === 'scan'"
            color="neutral"
            variant="ghost"
            @click="perform('scan')"
          />
        </div>
      </template>
      <template #content>
        <UButton
          :aria-label="messages.closeFeedback"
          icon="i-ri-close-line"
          color="neutral"
          variant="ghost"
          size="xs"
          class="absolute top-1 right-1"
          @click="feedbackOpen = false"
        />
        <div
          class="max-h-64 space-y-1.5 overflow-y-auto pr-5"
          role="status"
          :aria-label="messages.scanResult"
        >
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
      </template>
    </UPopover>
    <p class="text-xs text-muted">{{ messages.staticHint }}</p>
  </div>
</template>
