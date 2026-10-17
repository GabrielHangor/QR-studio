<script setup lang="ts">
import { computed } from "vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import USwitch from "@nuxt/ui/components/Switch.vue";

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
function finder(value: Partial<NonNullable<RenderQrSvgOptions["finder"]>>) {
  patch({
    finder: { outerShape: props.design.finderShape ?? "square", ...props.design.finder, ...value },
  });
}
</script>

<template>
  <div class="space-y-4 pb-4">
    <UFormField :label="messages.finderOuter"
      ><USelect
        :model-value="design.finder?.outerShape ?? design.finderShape ?? 'square'"
        :items="shapes"
        class="w-full"
        @update:model-value="finder({ outerShape: $event })"
    /></UFormField>
    <UFormField :label="messages.finderInner"
      ><USelect
        :model-value="
          design.finder?.innerShape ?? design.finder?.outerShape ?? design.finderShape ?? 'square'
        "
        :items="shapes"
        class="w-full"
        @update:model-value="finder({ innerShape: $event })"
    /></UFormField>
    <USwitch
      :model-value="design.finder?.outerColor !== undefined"
      :label="messages.customOuter"
      @update:model-value="finder({ outerColor: $event ? '#202833' : undefined })"
    />
    <div v-if="design.finder?.outerColor">
      <UFormField :label="messages.outerColor"
        ><UInput
          :model-value="design.finder.outerColor"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="finder({ outerColor: String($event) })"
      /></UFormField>
    </div>
    <USwitch
      :model-value="design.finder?.innerColor !== undefined"
      :label="messages.customInner"
      @update:model-value="finder({ innerColor: $event ? '#202833' : undefined })"
    />
    <div v-if="design.finder?.innerColor">
      <UFormField :label="messages.innerColor"
        ><UInput
          :model-value="design.finder.innerColor"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="finder({ innerColor: String($event) })"
      /></UFormField>
    </div>
  </div>
</template>
