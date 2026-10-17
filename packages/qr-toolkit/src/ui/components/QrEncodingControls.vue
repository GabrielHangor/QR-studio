<script setup lang="ts">
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import type {
  EncodeQrOptions,
  RenderQrSvgOptions,
  ErrorCorrectionLevel,
} from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";

defineProps<{
  encoding: EncodeQrOptions;
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
}>();
const emit = defineEmits<{
  "update:encoding": [value: EncodeQrOptions];
  "update:design": [value: RenderQrSvgOptions];
}>();
const levels: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const sizes = [256, 512, 1024, 2048];
</script>

<template>
  <div class="grid grid-cols-2 gap-4 pb-4">
    <UFormField :label="messages.ecc"
      ><USelect
        :model-value="encoding.errorCorrectionLevel ?? 'M'"
        :items="levels"
        class="w-full"
        @update:model-value="
          emit('update:encoding', { ...encoding, errorCorrectionLevel: $event })
        "
    /></UFormField>
    <UFormField :label="messages.version" :help="messages.versionHint"
      ><UInput
        :model-value="encoding.version === undefined ? '' : String(encoding.version)"
        type="number"
        :min="1"
        :max="40"
        :placeholder="messages.autoVersion"
        class="w-full"
        @update:model-value="
          emit('update:encoding', {
            ...encoding,
            version: $event === '' ? undefined : Number($event),
          })
        "
    /></UFormField>
    <UFormField :label="messages.size"
      ><USelect
        :model-value="design.size ?? 512"
        :items="sizes"
        class="w-full"
        @update:model-value="emit('update:design', { ...design, size: $event })"
    /></UFormField>
    <UFormField :label="messages.quietZone"
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
