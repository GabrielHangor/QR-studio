<script setup lang="ts">
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import { computed } from "vue";

import type { QrEditorConfig, QrEditorControls } from "../../editor/config.js";
import type {
  EncodeQrOptions,
  RenderQrSvgOptions,
  ErrorCorrectionLevel,
} from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import QrFieldHelp from "./QrFieldHelp.vue";

const props = defineProps<{
  encoding: EncodeQrOptions;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig;
  controls: readonly QrEditorControls["technical"][];
}>();
const emit = defineEmits<{
  "update:encoding": [value: EncodeQrOptions];
  "update:design": [value: RenderQrSvgOptions];
}>();
const levels = computed<{ label: string; value: ErrorCorrectionLevel }[]>(() => {
  const labels = {
    L: props.messages.eccLow,
    M: props.messages.eccMedium,
    Q: props.messages.eccQuartile,
    H: props.messages.eccHigh,
  };
  return props.config.choices.ecc.map((value) => ({ label: labels[value], value }));
});
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <UFormField v-if="controls.includes('ecc')" :label="messages.ecc">
      <template #hint>
        <QrFieldHelp :label="messages.ecc" :text="messages.eccHint" :action-label="messages.help" />
      </template>
      <USelect
        :model-value="encoding.errorCorrectionLevel ?? 'M'"
        :items="levels"
        class="w-full"
        @update:model-value="emit('update:encoding', { ...encoding, errorCorrectionLevel: $event })"
      />
    </UFormField>
    <UFormField v-if="controls.includes('quietZone')" :label="messages.quietZone">
      <template #hint>
        <QrFieldHelp
          :label="messages.quietZone"
          :text="messages.quietZoneHint"
          :action-label="messages.help"
        />
      </template>
      <UInput
        :model-value="design.quietZone ?? 4"
        type="number"
        :min="config.ranges.quietZone.min"
        :max="config.ranges.quietZone.max"
        :step="config.ranges.quietZone.step"
        class="w-full"
        @update:model-value="emit('update:design', { ...design, quietZone: Number($event) })"
      />
    </UFormField>
  </div>
</template>
