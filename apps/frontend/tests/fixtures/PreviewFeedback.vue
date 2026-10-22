<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
import { ru } from "@nuxt/ui/locale";
import {
  analyzeQrDesign,
  encodeQr,
  renderQrSvg,
  type QrDesignDiagnostic,
} from "@qr-studio/toolkit/engine";
import { fullEditorConfig, qrEditorMessagesRu, type QrEditorPreview } from "@qr-studio/toolkit/ui";
import { computed, ref } from "vue";

import QrPreview from "../../../../packages/qr-toolkit/src/ui/components/QrPreview.vue";

const matrix = encodeQr("QR");
const svg = renderQrSvg(matrix);
const enabled = ref(true);
const mode = ref("critical");
// Exercise every supported severity, including errors which the editor normally prevents rendering.
const cases: Record<string, readonly QrDesignDiagnostic[]> = {
  critical: [
    { code: "QUIET_ZONE_TOO_SMALL", severity: "error", params: { minimum: 4 } },
    { code: "QUIET_ZONE_CLIPPED", severity: "warning", params: {} },
    { code: "MODULE_SHAPE_REQUIRES_DEVICE_TEST", severity: "warning", params: {} },
  ],
  warning: [{ code: "QUIET_ZONE_CLIPPED", severity: "warning", params: {} }],
  styling: [
    { code: "MODULE_SHAPE_REQUIRES_DEVICE_TEST", severity: "warning", params: {} },
    { code: "FINDER_SHAPE_REQUIRES_DEVICE_TEST", severity: "warning", params: {} },
    { code: "GRADIENT_REQUIRES_DEVICE_TEST", severity: "warning", params: {} },
  ],
  none: [],
};
const preview = computed<QrEditorPreview>(() => ({
  status: "ready",
  matrix,
  payload: "QR",
  svg,
  analysis: { ...analyzeQrDesign(matrix), diagnostics: cases[mode.value]! },
}));
</script>

<template>
  <UApp :locale="ru">
    <main class="mx-auto max-w-xl space-y-4 p-4">
      <nav aria-label="Test feedback" class="flex flex-wrap gap-3">
        <button v-for="name in Object.keys(cases)" :key="name" type="button" @click="mode = name">
          {{ name }}
        </button>
        <button type="button" @click="enabled = !enabled">toggle recommendations</button>
      </nav>
      <QrPreview
        :preview="preview"
        :design="{ size: 512 }"
        :config="{ ...fullEditorConfig, recommendations: enabled }"
        :messages="qrEditorMessagesRu"
      />
    </main>
  </UApp>
</template>
