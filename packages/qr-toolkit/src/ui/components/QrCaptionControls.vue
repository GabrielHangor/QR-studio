<script setup lang="ts">
import { computed } from "vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import QrFieldHelp from "./QrFieldHelp.vue";
import { qrCaptionDrafts, updateQrCaption } from "../../editor/index.js";
import type { QrCaptionOptions, RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  position: "top" | "bottom";
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
const title = computed(() =>
  props.position === "top" ? props.messages.topCaption : props.messages.bottomCaption,
);
const caption = computed(() =>
  qrCaptionDrafts(props.design).find((value) => (value.position ?? "bottom") === props.position),
);
const styles = computed(() => [
  { label: props.messages.plain, value: "plain" as const },
  { label: props.messages.banner, value: "banner" as const },
  { label: props.messages.arc, value: "arc" as const, disabled: props.design.shape !== "circle" },
]);
const weights = computed<{ label: string; value: NonNullable<QrCaptionOptions["fontWeight"]> }[]>(
  () => [
    { label: props.messages.weightNormal, value: 400 },
    { label: props.messages.weightMedium, value: 500 },
    { label: props.messages.weightSemibold, value: 600 },
    { label: props.messages.weightBold, value: 700 },
  ],
);
function change(value: Partial<QrCaptionOptions>) {
  emit("update:design", updateQrCaption(props.design, props.position, value));
}
</script>

<template>
  <fieldset class="min-w-0 space-y-4 pb-5" :aria-label="title">
    <legend class="mb-3 font-medium text-highlighted">{{ title }}</legend>
    <UFormField :label="title + ': ' + messages.captionText"
      ><UInput
        :model-value="caption?.text ?? ''"
        :maxlength="80"
        class="w-full"
        @update:model-value="change({ text: String($event) })"
    /></UFormField>
    <UFormField :label="messages.captionStyle"
      ><USelect
        :model-value="caption?.style ?? 'plain'"
        :items="styles"
        class="w-full"
        @update:model-value="change({ style: $event })"
    /></UFormField>
    <div class="grid grid-cols-2 gap-4">
      <UFormField :label="messages.fontSize"
        ><template #hint
          ><QrFieldHelp
            :label="messages.fontSize"
            :text="messages.captionSizeHint"
            :action-label="messages.help" /></template
        ><UInput
          :model-value="caption?.fontSize ?? 18"
          type="number"
          :min="8"
          :max="48"
          :step="1"
          class="w-full"
          @update:model-value="change({ fontSize: Number($event) })"
      /></UFormField>
      <UFormField :label="messages.fontWeight"
        ><USelect
          :model-value="caption?.fontWeight ?? 400"
          :items="weights"
          class="w-full"
          @update:model-value="change({ fontWeight: $event })"
      /></UFormField>
      <UFormField :label="messages.letterSpacing"
        ><UInput
          :model-value="caption?.letterSpacing ?? 0"
          type="number"
          :min="0"
          :max="10"
          :step="0.25"
          class="w-full"
          @update:model-value="change({ letterSpacing: Number($event) })" /></UFormField
      ><UFormField :label="messages.captionColor"
        ><UInput
          :model-value="
            caption?.color ??
            (typeof design.foreground === 'string' ? design.foreground : '#000000')
          "
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="change({ color: String($event) })"
      /></UFormField>
    </div>
    <div v-if="caption?.style === 'banner'">
      <UFormField :label="messages.captionBackground"
        ><UInput
          :model-value="caption?.background ?? design.background ?? '#ffffff'"
          type="color"
          :ui="{ base: 'h-11 cursor-pointer p-1' }"
          class="w-full"
          @update:model-value="change({ background: String($event) })"
      /></UFormField>
    </div>
  </fieldset>
</template>
