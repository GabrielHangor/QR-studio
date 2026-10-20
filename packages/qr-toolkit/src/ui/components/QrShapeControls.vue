<script setup lang="ts">
import { computed } from "vue";

import type { QrEditorConfig, QrEditorControls } from "../../editor/config.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import { qrShapeThumbnail } from "../visuals.js";
import QrArtworkControls from "./QrArtworkControls.vue";
import QrFinderControls from "./QrFinderControls.vue";
import QrVisualPicker from "./QrVisualPicker.vue";

const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig;
  controls: readonly QrEditorControls["shapes"][];
}>();
const emit = defineEmits<{
  "update:design": [value: RenderQrSvgOptions];
}>();
const modules = computed(() =>
  props.config.choices.moduleShape.map((value) => ({
    value,
    label: props.messages.shapeLabels[value],
    source: qrShapeThumbnail("modules", value),
  })),
);
</script>

<template>
  <div class="@container space-y-3">
    <div v-if="controls.includes('moduleShape')" class="space-y-1.5">
      <h4 class="text-sm font-medium text-highlighted">{{ messages.moduleShape }}</h4>
      <QrVisualPicker
        compact
        hide-labels
        :label="messages.moduleShape"
        :items="modules"
        :model-value="design.moduleShape ?? 'square'"
        @update:model-value="emit('update:design', { ...design, moduleShape: $event })"
      />
    </div>
    <QrFinderControls
      v-if="controls.includes('finderOuter') || controls.includes('finderInner')"
      :config="config"
      :controls="controls"
      :design="design"
      :messages="messages"
      @update:design="emit('update:design', $event)"
    />
    <QrArtworkControls
      v-if="
        controls.includes('artworkShape') ||
        controls.includes('frame') ||
        controls.includes('frameWidth')
      "
      :config="config"
      :controls="controls"
      :design="design"
      :messages="messages"
      @update:design="emit('update:design', $event)"
    />
  </div>
</template>
