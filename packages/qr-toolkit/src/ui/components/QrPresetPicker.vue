<script setup lang="ts">
import { computed } from "vue";

import type { QrDesignPreset } from "../../editor/index.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import { qrDesignThumbnail } from "../visuals.js";
import QrVisualPicker from "./QrVisualPicker.vue";

const props = defineProps<{
  presets: readonly QrDesignPreset[];
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
}>();
const emit = defineEmits<{ preset: [value: QrDesignPreset] }>();
const items = computed(() =>
  props.presets.map((preset) => ({
    value: preset.id,
    label: preset.title,
    source: qrDesignThumbnail(preset.design),
  })),
);
const selectedPreset = computed(() => props.presets.find((preset) => preset.id === selected.value));
const selected = computed(() => {
  const source = qrDesignThumbnail(props.design);
  return source ? items.value.find((item) => item.source === source)?.value : undefined;
});
function choose(id: string) {
  const preset = props.presets.find((value) => value.id === id);
  if (preset) emit("preset", preset);
}
</script>

<template>
  <QrVisualPicker
    :label="messages.presets"
    :items="items"
    :model-value="selected"
    large
    @update:model-value="choose"
  />
  <p v-if="selectedPreset?.description" class="mt-3 text-sm text-muted">
    {{ selectedPreset.description }}
  </p>
</template>
