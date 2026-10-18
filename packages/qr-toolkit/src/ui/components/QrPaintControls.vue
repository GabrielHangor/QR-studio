<script setup lang="ts">
import QrColorInput from "./QrColorInput.vue";
import { computed } from "vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import USwitch from "@nuxt/ui/components/Switch.vue";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
const props = defineProps<{ design: RenderQrSvgOptions; messages: QrEditorMessages }>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
function patch(value: Partial<RenderQrSvgOptions>) {
  emit("update:design", { ...props.design, ...value });
}

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
function finder(value: Partial<NonNullable<RenderQrSvgOptions["finder"]>>) {
  patch({
    finder: { outerShape: props.design.finderShape ?? "square", ...props.design.finder, ...value },
  });
}
const frame = computed(() => (typeof props.design.frame === "object" ? props.design.frame : {}));
</script>

<template>
  <div class="grid gap-3 @min-[38rem]:grid-cols-2">
    <UFormField :label="messages.fill" class="@min-[38rem]:col-span-2"
      ><USelect
        :model-value="gradient?.direction ?? 'solid'"
        :items="fills"
        class="w-full"
        @update:model-value="changeFill($event)"
    /></UFormField>
    <div class="grid gap-4 sm:grid-cols-2 @min-[38rem]:col-span-2">
      <UFormField :label="messages.foreground"
        ><QrColorInput
          :label="messages.foreground"
          :model-value="foreground"
          class="w-full"
          @update:model-value="changeForeground(String($event))" /></UFormField
      ><UFormField :label="messages.background"
        ><QrColorInput
          :label="messages.background"
          light
          :model-value="design.background ?? '#ffffff'"
          class="w-full"
          @update:model-value="patch({ background: String($event) })"
      /></UFormField>
    </div>
    <div v-if="gradient">
      <UFormField :label="messages.gradientEnd"
        ><QrColorInput
          :label="messages.gradientEnd"
          :model-value="gradient.endColor"
          class="w-full"
          @update:model-value="patch({ foreground: { ...gradient, endColor: String($event) } })"
      /></UFormField>
    </div>
    <details class="@min-[38rem]:col-span-2">
      <summary class="cursor-pointer py-2 text-sm font-medium text-highlighted">
        {{ messages.cornerColors }}
      </summary>
      <div class="mt-3 grid gap-4 sm:grid-cols-2">
        <div class="space-y-3">
          <USwitch
            :model-value="design.finder?.outerColor !== undefined"
            :label="messages.customOuter"
            @update:model-value="finder({ outerColor: $event ? '#202833' : undefined })"
          />
          <UFormField v-if="design.finder?.outerColor" :label="messages.outerColor"
            ><QrColorInput
              :label="messages.outerColor"
              :model-value="design.finder.outerColor"
              class="w-full"
              @update:model-value="finder({ outerColor: String($event) })"
          /></UFormField>
        </div>
        <div class="space-y-3">
          <USwitch
            :model-value="design.finder?.innerColor !== undefined"
            :label="messages.customInner"
            @update:model-value="finder({ innerColor: $event ? '#202833' : undefined })"
          />
          <UFormField v-if="design.finder?.innerColor" :label="messages.innerColor"
            ><QrColorInput
              :label="messages.innerColor"
              :model-value="design.finder.innerColor"
              class="w-full"
              @update:model-value="finder({ innerColor: String($event) })"
          /></UFormField>
        </div>
      </div>
    </details>
    <details class="@min-[38rem]:col-span-2">
      <summary class="cursor-pointer py-2 text-sm font-medium text-highlighted">
        {{ messages.moreColors }}
      </summary>
      <div class="mt-3 space-y-3">
        <USwitch
          :model-value="design.artworkBackground !== undefined"
          :label="messages.separateBackground"
          @update:model-value="
            patch({ artworkBackground: $event ? (design.background ?? '#ffffff') : undefined })
          "
        />
        <UFormField
          v-if="design.artworkBackground !== undefined"
          :label="messages.artworkBackground"
          ><QrColorInput
            :label="messages.artworkBackground"
            light
            :model-value="design.artworkBackground"
            class="w-full"
            @update:model-value="patch({ artworkBackground: String($event) })"
        /></UFormField>
      </div>
    </details>
    <div
      v-if="design.frame && design.frame !== 'none' && frame.style !== 'none'"
      class="@min-[38rem]:col-span-2"
    >
      <UFormField :label="messages.frameColor"
        ><QrColorInput
          :label="messages.frameColor"
          :model-value="frame.color ?? '#202833'"
          class="w-full"
          @update:model-value="patch({ frame: { ...frame, color: String($event) } })"
      /></UFormField>
    </div>
  </div>
</template>
