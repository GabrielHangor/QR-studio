<script setup lang="ts">
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import { computed } from "vue";

import type { QrEditorConfig, QrEditorControls } from "../../editor/config.js";
import { qrCaptionDrafts, updateQrCaption } from "../../editor/index.js";
import type { QrCaptionOptions, RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import QrColorInput from "./QrColorInput.vue";
import QrFieldHelp from "./QrFieldHelp.vue";

const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig;
  controls: readonly QrEditorControls["captions"][];
  position: "top" | "bottom";
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
const title = computed(() =>
  props.position === "top" ? props.messages.topCaption : props.messages.bottomCaption,
);
const caption = computed(() =>
  qrCaptionDrafts(props.design).find((value) => (value.position ?? "bottom") === props.position),
);
const styles = computed(() =>
  props.config.choices.captionStyle.map((value) => ({
    label: props.messages[value],
    value,
    disabled: value === "arc" && props.design.shape !== "circle",
  })),
);
const weights = computed(() => {
  const labels = {
    400: props.messages.weightNormal,
    500: props.messages.weightMedium,
    600: props.messages.weightSemibold,
    700: props.messages.weightBold,
  };
  return props.config.choices.fontWeight.map((value) => ({ label: labels[value], value }));
});
function change(value: Partial<QrCaptionOptions>) {
  emit("update:design", updateQrCaption(props.design, props.position, value));
}
</script>

<template>
  <fieldset class="min-w-0 space-y-4 pb-5" :aria-label="title">
    <legend class="mb-3 font-medium text-highlighted">{{ title }}</legend>
    <UFormField v-if="controls.includes('text')" :label="title + ': ' + messages.captionText">
      <UInput
        :model-value="caption?.text ?? ''"
        :maxlength="config.ranges.captionTextMaxLength"
        class="w-full"
        @update:model-value="change({ text: String($event) })"
      />
    </UFormField>
    <template v-if="caption?.text.trim()">
      <UFormField v-if="controls.includes('style')" :label="messages.captionStyle">
        <USelect
          :model-value="caption?.style ?? 'plain'"
          :items="styles"
          class="w-full"
          @update:model-value="change({ style: $event })"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField v-if="controls.includes('fontSize')" :label="messages.fontSize">
          <template #hint>
            <QrFieldHelp
              :label="messages.fontSize"
              :text="messages.captionSizeHint"
              :action-label="messages.help"
            />
          </template>
          <UInput
            :model-value="caption?.fontSize ?? 18"
            type="number"
            :min="config.ranges.captionFontSize.min"
            :max="config.ranges.captionFontSize.max"
            :step="config.ranges.captionFontSize.step"
            class="w-full"
            @update:model-value="change({ fontSize: Number($event) })"
          />
        </UFormField>
        <UFormField
          v-if="controls.includes('color')"
          :label="messages.captionColor"
          class="col-span-2"
        >
          <QrColorInput
            :palette="config.palettes.foreground"
            :label="messages.captionColor"
            :model-value="
              caption?.color ??
              (typeof design.foreground === 'string' ? design.foreground : '#000000')
            "
            class="w-full"
            @update:model-value="change({ color: String($event) })"
          />
        </UFormField>
      </div>
      <div v-if="caption?.style === 'banner' && controls.includes('background')">
        <UFormField :label="messages.captionBackground">
          <QrColorInput
            :palette="config.palettes.background"
            :label="messages.captionBackground"
            :model-value="caption?.background ?? design.background ?? '#ffffff'"
            class="w-full"
            @update:model-value="change({ background: String($event) })"
          />
        </UFormField>
      </div>
      <details v-if="controls.includes('fontWeight') || controls.includes('letterSpacing')">
        <summary class="cursor-pointer py-2 text-sm font-medium text-highlighted">
          {{ messages.advanced }}
        </summary>
        <div class="mt-3 grid grid-cols-2 gap-4">
          <UFormField v-if="controls.includes('fontWeight')" :label="messages.fontWeight">
            <USelect
              :model-value="caption.fontWeight ?? 400"
              :items="weights"
              class="w-full"
              @update:model-value="change({ fontWeight: $event })"
            />
          </UFormField>
          <UFormField v-if="controls.includes('letterSpacing')" :label="messages.letterSpacing">
            <UInput
              :model-value="caption.letterSpacing ?? 0"
              type="number"
              :min="config.ranges.captionLetterSpacing.min"
              :max="config.ranges.captionLetterSpacing.max"
              :step="config.ranges.captionLetterSpacing.step"
              class="w-full"
              @update:model-value="change({ letterSpacing: Number($event) })"
            />
          </UFormField>
        </div>
      </details>
    </template>
  </fieldset>
</template>
