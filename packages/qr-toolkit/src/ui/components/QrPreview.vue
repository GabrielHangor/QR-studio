<script setup lang="ts">
import { computed } from "vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UAlert from "@nuxt/ui/components/Alert.vue";
import { formatQrError, formatQrDiagnostic } from "../../i18n/index.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";

const props = defineProps<{ preview: QrEditorPreview; messages: QrEditorMessages }>();
const failure = computed(() =>
  props.preview.status === "error"
    ? formatQrError(props.preview.error, props.messages.engine)
    : undefined,
);
const diagnostics = computed(() =>
  props.preview.status === "ready" ? props.preview.analysis.diagnostics : [],
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
  <UCard :aria-label="messages.preview">
    <template #header
      ><h3 class="font-semibold text-highlighted">{{ messages.preview }}</h3></template
    >
    <div
      class="flex min-h-80 flex-col items-center justify-center gap-4 rounded-lg bg-elevated p-6 sm:p-8"
    >
      <img
        v-if="previewSource"
        :src="previewSource"
        :alt="messages.previewAlt"
        class="block h-auto w-full max-w-80"
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
          {{ preview.status === "invalid" ? messages.invalidUrl : messages.emptyHint }}
        </p>
      </div>
    </div>
    <ul v-if="diagnostics.length" class="mt-4 space-y-3" aria-live="polite">
      <li v-for="diagnostic in diagnostics" :key="diagnostic.code">
        <UAlert
          :color="diagnostic.severity === 'error' ? 'error' : 'warning'"
          :description="formatQrDiagnostic(diagnostic, messages.engine)"
          variant="subtle"
        />
      </li>
    </ul>
    <template #footer
      ><p class="text-sm text-muted">{{ messages.staticHint }}</p></template
    >
  </UCard>
</template>
