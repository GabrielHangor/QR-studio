<script setup lang="ts">
import { computed } from "vue";
import QrVisualPicker from "./QrVisualPicker.vue";
import QrFinderControls from "./QrFinderControls.vue";
import QrArtworkControls from "./QrArtworkControls.vue";
import { qrShapeThumbnail } from "../visuals.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";

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
  <div class="@container space-y-5">
    <div class="space-y-2">
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
