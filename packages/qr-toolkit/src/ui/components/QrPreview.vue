<script setup lang="ts">
import UAccordion from "@nuxt/ui/components/Accordion.vue";
import UAlert from "@nuxt/ui/components/Alert.vue";
import UCard from "@nuxt/ui/components/Card.vue";
import { computed, ref } from "vue";

import type { QrEditorConfig } from "../../editor/config.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import { formatQrError, formatQrDiagnostic } from "../../i18n/index.js";
import { QrBrowserError } from "../browser.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";
import QrExportActions from "./QrExportActions.vue";

const props = defineProps<{
  preview: QrEditorPreview;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig;
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
const recommendationsOpen = ref<string>();
const failure = computed(() => {
  if (props.preview.status !== "error") return undefined;
  if (props.preview.error instanceof QrBrowserError) {
    return props.messages[props.preview.error.code];
  }
  return formatQrError(props.preview.error, props.messages.engine);
});
const diagnostics = computed(() =>
  props.preview.status === "ready" ? props.preview.analysis.diagnostics : [],
);
// Styling notices describe the same action; retain concrete risks as separate recommendations.
const stylingCodes = new Set([
  "MODULE_SHAPE_REQUIRES_DEVICE_TEST",
  "FINDER_SHAPE_REQUIRES_DEVICE_TEST",
  "GRADIENT_REQUIRES_DEVICE_TEST",
]);
const stylingNotice = computed(() => diagnostics.value.some((item) => stylingCodes.has(item.code)));
const recommendations = computed(() =>
  diagnostics.value.filter((item) => !stylingCodes.has(item.code)),
);
// An image document isolates SVG fragment IDs when several editors share the page.
// It needs neither DOM injection nor an object URL with a cleanup lifecycle.
const previewSource = computed(() =>
  props.preview.status === "ready"
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(props.preview.svg)}`
    : undefined,
);
</script>

<template>
  <UCard
    :aria-label="messages.preview"
    :ui="{
      root: 'lg:flex lg:h-[min(44rem,calc(100dvh-14rem))] lg:flex-col',
      header: 'px-4 py-3 sm:px-4 lg:shrink-0',
      body: 'p-4 sm:p-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-3 lg:overflow-y-auto',
    }"
  >
    <template #header>
      <h3 class="font-semibold text-highlighted">{{ messages.preview }}</h3>
    </template>
    <div
      class="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg bg-elevated p-4 lg:min-h-32 lg:flex-1 lg:p-3"
    >
      <img
        v-if="previewSource"
        :src="previewSource"
        :alt="messages.previewAlt"
        class="block h-auto w-full max-w-md lg:h-full lg:max-w-none lg:object-contain"
      />
      <UAlert
        v-else-if="failure"
        color="error"
        :title="messages.generationError"
        :description="failure"
        role="alert"
      />
      <div v-else class="space-y-2 text-center" role="status">
        <p class="font-medium text-highlighted">{{ messages.emptyPreview }}</p>
        <p class="text-sm text-muted">
          {{
            preview.status === "loading"
              ? messages.loadingLogo
              : preview.status === "invalid"
                ? preview.code === "INVALID_URL"
                  ? messages.invalidUrl
                  : messages.invalidContent
                : messages.emptyHint
          }}
        </p>
      </div>
    </div>
    <QrExportActions
      :config="config.export"
      :preview="preview"
      :design="design"
      :messages="messages"
      class="mt-4 lg:mt-0 lg:shrink-0"
      @update:design="emit('update:design', $event)"
    />
    <UAccordion
      v-if="config.recommendations && (recommendations.length || stylingNotice)"
      v-model="recommendationsOpen"
      :items="[
        { label: messages.recommendations, value: 'recommendations', slot: 'recommendations' },
      ]"
      class="mt-3 lg:mt-0 lg:shrink-0"
      :ui="{ trigger: 'py-2 text-xs font-semibold text-highlighted', body: 'pb-1' }"
      :aria-label="messages.recommendations"
    >
      <template #recommendations>
        <ul
          class="max-h-48 list-disc space-y-2 overflow-y-auto ps-5 text-xs text-muted"
          tabindex="0"
          :aria-label="messages.recommendations"
        >
          <li
            v-for="(diagnostic, index) in recommendations"
            :key="diagnostic.code + index"
            :class="diagnostic.severity === 'error' ? 'text-error' : undefined"
          >
            {{ formatQrDiagnostic(diagnostic, messages.engine) }}
          </li>
          <li v-if="stylingNotice">{{ messages.stylingNotice }}</li>
        </ul>
      </template>
    </UAccordion>
  </UCard>
</template>
