<script setup lang="ts">
import { computed } from "vue";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import { qrShapeThumbnail } from "../visuals.js";
import QrArtworkControls from "./QrArtworkControls.vue";
import QrFinderControls from "./QrFinderControls.vue";
import QrVisualPicker from "./QrVisualPicker.vue";

const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
}>();
const emit = defineEmits<{
  "update:design": [value: RenderQrSvgOptions];
}>();
const modules = computed(() =>
  (["square", "rounded", "circle", "soft", "leaf", "leaf-reverse"] as const).map((value) => ({
    value,
    label: props.messages.shapeLabels[value],
    source: qrShapeThumbnail("modules", value),
  })),
);
</script>

<template>
  <div class="@container space-y-3">
    <div class="space-y-1.5">
      <h4 class="text-sm font-medium text-highlighted">{{ messages.moduleShape }}</h4>
      <QrVisualPicker
        :label="messages.moduleShape"
        :items="modules"
        :model-value="design.moduleShape ?? 'square'"
        @update:model-value="emit('update:design', { ...design, moduleShape: $event })"
      />
    </div>
    <QrFinderControls
      :design="design"
      :messages="messages"
      @update:design="emit('update:design', $event)"
    />
    <QrArtworkControls
      :design="design"
      :messages="messages"
      @update:design="emit('update:design', $event)"
    />
  </div>
</template>
