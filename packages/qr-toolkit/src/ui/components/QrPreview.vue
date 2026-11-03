<script setup lang="ts">
import UAlert from "@nuxt/ui/components/Alert.vue";
import UCard from "@nuxt/ui/components/Card.vue";
import { computed } from "vue";

import type { QrEditorConfig } from "../../editor/config.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import { formatQrError, formatQrDiagnostic } from "../../i18n/index.js";
import { QrBrowserError } from "../browser.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";
import QrExportActions from "./QrExportActions.vue";

const props = defineProps<{
  preview: QrEditorPreview;
  loadingLogo?: boolean;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig;
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
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
const criticalRecommendations = computed(() =>
  diagnostics.value
    .filter((item) => item.severity === "error")
    .map((item) => formatQrDiagnostic(item, props.messages.engine)),
);
const recommendations = computed(() => {
  const warnings = diagnostics.value.filter(
    (item) => item.severity === "warning" && !stylingCodes.has(item.code),
  );
  const styling = diagnostics.value.some(
    (item) => item.severity === "warning" && stylingCodes.has(item.code),
  );
  const format = (items: typeof diagnostics.value) =>
    items.map((item) => formatQrDiagnostic(item, props.messages.engine));
  return [
    {
      id: "warning",
      color: "warning" as const,
      icon: "i-ri-alert-line",
      title: props.messages.warningRecommendations,
      items: format(warnings),
    },
    {
      id: "styling",
      color: "info" as const,
      icon: "i-ri-information-line",
      title: props.messages.stylingRecommendations,
      items: styling ? [props.messages.stylingNotice] : [],
    },
  ].filter((group) => group.items.length);
});
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
      body: 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-3 lg:overflow-y-auto',
    }"
  >
    <template #header>
      <h3 class="font-semibold text-highlighted">{{ messages.preview }}</h3>
    </template>
    <UAlert
      v-if="config.recommendations && criticalRecommendations.length"
      color="error"
      variant="subtle"
      icon="i-ri-error-warning-line"
      :title="messages.criticalRecommendations"
      :aria-label="messages.criticalRecommendations"
      role="alert"
      class="mb-3 lg:mb-0 lg:shrink-0"
    >
      <template #description>
        <ul
          :aria-label="messages.criticalRecommendations"
          class="space-y-1.5"
          :class="criticalRecommendations.length > 1 ? 'list-disc ps-4' : undefined"
        >
          <li v-for="(text, index) in criticalRecommendations" :key="index">{{ text }}</li>
        </ul>
      </template>
    </UAlert>
    <div
      :aria-busy="loadingLogo"
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
      :disabled="loadingLogo"
      :config="config.export"
      :preview="preview"
      :design="design"
      :messages="messages"
      class="mt-4 lg:mt-0 lg:shrink-0"
      @update:design="emit('update:design', $event)"
    />
    <section
      v-if="config.recommendations && recommendations.length"
      :aria-label="messages.recommendations"
      class="mt-3 space-y-2 lg:mt-0 lg:shrink-0"
    >
      <UAlert
        v-for="group in recommendations"
        :key="group.id"
        :color="group.color"
        variant="subtle"
        :icon="group.icon"
        :title="group.title"
        :aria-label="group.title"
      >
        <template #description>
          <ul
            :aria-label="group.title"
            class="space-y-1.5"
            :class="group.items.length > 1 ? 'list-disc ps-4' : undefined"
          >
            <li v-for="(text, index) in group.items" :key="index">{{ text }}</li>
          </ul>
        </template>
      </UAlert>
    </section>
  </UCard>
</template>
