<script setup lang="ts">
import { computed } from "vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{ design: RenderQrSvgOptions; messages: QrEditorMessages }>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
const moduleShapes = computed(() => [
  { label: props.messages.square, value: "square" as const },
  { label: props.messages.rounded, value: "rounded" as const },
  { label: props.messages.circle, value: "circle" as const },
]);
const foreground = computed(() => {
  const fill = props.design.foreground;
  return typeof fill === "string" ? fill : (fill?.startColor ?? "#000000");
});
function updateDesign<K extends keyof RenderQrSvgOptions>(key: K, value: RenderQrSvgOptions[K]) {
  emit("update:design", { ...props.design, [key]: value });
}
</script>

<template>
  <UCard>
    <template #header
      ><h3 class="font-semibold text-highlighted">{{ messages.design }}</h3></template
    >
    <div class="space-y-5">
      <UFormField :label="messages.moduleShape">
        <USelect
          :model-value="props.design.moduleShape ?? 'square'"
          :items="moduleShapes"
          class="w-full"
          size="lg"
          @update:model-value="updateDesign('moduleShape', $event)"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="messages.foreground">
          <UInput
            :model-value="foreground"
            type="color"
            :ui="{ base: 'h-11 cursor-pointer p-1' }"
            class="w-full"
            size="lg"
            @update:model-value="updateDesign('foreground', String($event))"
          />
        </UFormField>
        <UFormField :label="messages.background">
          <UInput
            :model-value="props.design.background ?? '#ffffff'"
            type="color"
            :ui="{ base: 'h-11 cursor-pointer p-1' }"
            class="w-full"
            size="lg"
            @update:model-value="updateDesign('background', String($event))"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
