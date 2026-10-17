<script setup lang="ts">
import { computed } from "vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import USwitch from "@nuxt/ui/components/Switch.vue";
import { changeQrArtworkShape } from "../../editor/index.js";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
const props = defineProps<{ design: RenderQrSvgOptions; messages: QrEditorMessages }>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
function patch(value: Partial<RenderQrSvgOptions>) {
  emit("update:design", { ...props.design, ...value });
}

const shapes = computed(() => [
  { label: props.messages.square, value: "square" as const },
  { label: props.messages.circle, value: "circle" as const },
]);
const frame = computed(() => (typeof props.design.frame === "object" ? props.design.frame : {}));
const framed = computed(
  () =>
    props.design.frame !== undefined &&
    props.design.frame !== "none" &&
    frame.value.style !== "none",
);
</script>

<template>
  <div class="space-y-4 pb-4">
    <UFormField :label="messages.artworkShape"
      ><USelect
        :model-value="design.shape ?? 'square'"
        :items="shapes"
        class="w-full"
        @update:model-value="emit('update:design', changeQrArtworkShape(design, $event))"
    /></UFormField>
    <USwitch
      :model-value="design.artworkBackground !== undefined"
      :label="messages.separateBackground"
      @update:model-value="
        patch({ artworkBackground: $event ? (design.background ?? '#ffffff') : undefined })
      "
    />
    <div v-if="design.artworkBackground !== undefined">
      <UFormField :label="messages.artworkBackground"
        ><UInput
          :model-value="design.artworkBackground ?? '#ffffff'"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="patch({ artworkBackground: String($event) })"
      /></UFormField>
    </div>
    <USwitch
      :model-value="framed"
      :label="messages.frame"
      @update:model-value="
        patch({ frame: $event ? { style: 'outline', color: '#202833', widthPx: 2 } : 'none' })
      "
    />
    <div v-if="framed" class="grid grid-cols-2 gap-4">
      <UFormField :label="messages.frameColor"
        ><UInput
          :model-value="frame.color ?? '#202833'"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="patch({ frame: { ...frame, color: String($event) } })" /></UFormField
      ><UFormField :label="messages.frameWidth"
        ><UInput
          :model-value="frame.widthPx ?? 2"
          type="number"
          :min="0.5"
          :max="16"
          :step="0.5"
          class="w-full"
          @update:model-value="patch({ frame: { ...frame, widthPx: Number($event) } })"
      /></UFormField>
    </div>
  </div>
</template>
