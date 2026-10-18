<script setup lang="ts">
import { computed } from "vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
const props = defineProps<{ design: RenderQrSvgOptions; messages: QrEditorMessages }>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
function patch(value: Partial<RenderQrSvgOptions>) {
  emit("update:design", { ...props.design, ...value });
}

const shapes = computed(() => [
  { label: props.messages.square, value: "square" as const },
  { label: props.messages.rounded, value: "rounded" as const },
  { label: props.messages.circle, value: "circle" as const },
]);
const fills = computed(() => [
  { label: props.messages.solid, value: "solid" as const },
  { label: props.messages.horizontal, value: "horizontal" as const },
  { label: props.messages.vertical, value: "vertical" as const },
  { label: props.messages.diagonal, value: "diagonal" as const },
]);
const gradient = computed(() =>
  typeof props.design.foreground === "object" ? props.design.foreground : undefined,
);
const foreground = computed(
  () =>
    gradient.value?.startColor ??
    (typeof props.design.foreground === "string" ? props.design.foreground : "#000000"),
);
function changeFill(direction: "solid" | "horizontal" | "vertical" | "diagonal") {
  patch({
    foreground:
      direction === "solid"
        ? foreground.value
        : {
            type: "linear",
            direction,
            startColor: foreground.value,
            endColor: gradient.value?.endColor ?? "#536dfe",
          },
  });
}
function changeForeground(value: string) {
  patch({ foreground: gradient.value ? { ...gradient.value, startColor: value } : value });
}
</script>

<template>
  <div class="grid gap-5 @min-[38rem]:grid-cols-2">
    <UFormField :label="messages.moduleShape"
      ><USelect
        :model-value="design.moduleShape ?? 'square'"
        :items="shapes"
        class="w-full"
        size="lg"
        @update:model-value="patch({ moduleShape: $event })"
    /></UFormField>
    <UFormField :label="messages.fill"
      ><USelect
        :model-value="gradient?.direction ?? 'solid'"
        :items="fills"
        class="w-full"
        @update:model-value="changeFill($event)"
    /></UFormField>
    <div class="grid grid-cols-2 gap-4">
      <UFormField :label="messages.foreground"
        ><UInput
          :model-value="foreground"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="changeForeground(String($event))" /></UFormField
      ><UFormField :label="messages.background"
        ><UInput
          :model-value="design.background ?? '#ffffff'"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="patch({ background: String($event) })"
      /></UFormField>
    </div>
    <div v-if="gradient">
      <UFormField :label="messages.gradientEnd"
        ><UInput
          :model-value="gradient.endColor"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="patch({ foreground: { ...gradient, endColor: String($event) } })"
      /></UFormField>
    </div>
  </div>
</template>
