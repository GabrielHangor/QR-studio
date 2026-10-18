<script setup lang="ts">
import { computed } from "vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UAccordion from "@nuxt/ui/components/Accordion.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import QrExportActions from "./QrExportActions.vue";
import UAlert from "@nuxt/ui/components/Alert.vue";
import { QrBrowserError } from "../browser.js";
import { formatQrError, formatQrDiagnostic } from "../../i18n/index.js";
import type { QrEditorMessages } from "../messages.js";
import type { QrEditorPreview } from "../useQrEditor.js";

const props = defineProps<{ preview: QrEditorPreview; messages: QrEditorMessages }>();
const failure = computed(() =>
  props.preview.status === "error"
    ? props.preview.error instanceof QrBrowserError
      ? props.messages[props.preview.error.code]
      : formatQrError(props.preview.error, props.messages.engine)
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
          {{
            preview.status === "loading"
              ? messages.loadingLogo
              : preview.status === "invalid"
                ? messages.invalidUrl
                : messages.emptyHint
          }}
        </p>
      </div>
    </div>
    <QrExportActions :preview="preview" :messages="messages" class="mt-5" />
    <UAccordion
      v-if="preview.status === 'ready'"
      :items="[
        {
          label: messages.details + (diagnostics.length ? ' (' + diagnostics.length + ')' : ''),
          slot: 'details',
        },
      ]"
      class="mt-4 rounded-lg bg-elevated/50 px-3"
      :ui="{ trigger: 'font-semibold text-highlighted' }"
    >
      <template #details>
        <dl
          v-if="preview.status === 'ready'"
          class="mt-5 grid grid-cols-2 gap-3 text-sm"
          :aria-label="messages.metrics"
        >
          <div>
            <dt class="text-muted">{{ messages.version }}</dt>
            <dd class="font-medium text-highlighted">
              {{ preview.matrix.version }} / {{ preview.matrix.errorCorrectionLevel }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">{{ messages.matrixSize }}</dt>
            <dd>{{ preview.matrix.size }} × {{ preview.matrix.size }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ messages.modulePitch }}</dt>
            <dd>{{ preview.analysis.modulePitchPx.toFixed(2) }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ messages.contrast }}</dt>
            <dd>{{ preview.analysis.contrastRatio?.toFixed(2) ?? messages.notMeasured }}</dd>
          </div>
          <div v-if="preview.analysis.logoCoveragePercent !== null">
            <dt class="text-muted">{{ messages.logoCoverage }}</dt>
            <dd>{{ preview.analysis.logoCoveragePercent.toFixed(2) }}</dd>
          </div>
        </dl>
        <ul v-if="diagnostics.length" class="mt-4 space-y-3" aria-live="polite">
          <li v-for="diagnostic in diagnostics" :key="diagnostic.code">
            <UAlert
              :color="diagnostic.severity === 'error' ? 'error' : 'warning'"
              :description="formatQrDiagnostic(diagnostic, messages.engine)"
              variant="subtle"
            />
          </li>
        </ul>
      </template>
    </UAccordion>
    <UAccordion
      v-if="preview.status === 'ready'"
      :items="[{ label: messages.svgSource, slot: 'source' }]"
      class="mt-4"
      :ui="{ trigger: 'font-semibold text-highlighted' }"
    >
      <template #source
        ><UTextarea
          :aria-label="messages.svgSource"
          :model-value="preview.svg"
          readonly
          :rows="6"
          class="w-full"
          :ui="{ base: 'font-mono text-xs' }"
      /></template>
    </UAccordion>
    <template #footer
      ><p class="text-sm text-muted">{{ messages.staticHint }}</p></template
    >
  </UCard>
</template>
