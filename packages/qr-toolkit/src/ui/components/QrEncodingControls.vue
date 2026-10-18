<script setup lang="ts">
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import QrFieldHelp from "./QrFieldHelp.vue";
import { computed } from "vue";
import type {
  EncodeQrOptions,
  RenderQrSvgOptions,
  ErrorCorrectionLevel,
} from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{
  encoding: EncodeQrOptions;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
}>();
const emit = defineEmits<{
  "update:encoding": [value: EncodeQrOptions];
  "update:design": [value: RenderQrSvgOptions];
}>();
const levels = computed<{ label: string; value: ErrorCorrectionLevel }[]>(() => [
  { label: props.messages.eccLow, value: "L" },
  { label: props.messages.eccMedium, value: "M" },
  { label: props.messages.eccQuartile, value: "Q" },
  { label: props.messages.eccHigh, value: "H" },
]);
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <UFormField :label="messages.ecc"
      ><template #hint
        ><QrFieldHelp
          :label="messages.ecc"
          :text="messages.eccHint"
          :action-label="messages.help" /></template
      ><USelect
        :model-value="encoding.errorCorrectionLevel ?? 'M'"
        :items="levels"
        class="w-full"
        @update:model-value="
          emit('update:encoding', { ...encoding, errorCorrectionLevel: $event })
        "
    /></UFormField>
    <UFormField :label="messages.quietZone"
      ><template #hint
        ><QrFieldHelp
          :label="messages.quietZone"
          :text="messages.quietZoneHint"
          :action-label="messages.help" /></template
      ><UInput
        :model-value="design.quietZone ?? 4"
        type="number"
        :min="4"
        :max="12"
        :step="1"
        class="w-full"
        @update:model-value="emit('update:design', { ...design, quietZone: Number($event) })"
    /></UFormField>
  </div>
</template>
