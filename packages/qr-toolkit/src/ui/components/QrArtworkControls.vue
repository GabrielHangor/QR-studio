<script setup lang="ts">
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import { computed } from "vue";

import type { QrEditorConfig, QrEditorControls } from "../../editor/config.js";
import { changeQrArtworkShape } from "../../editor/index.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import { qrShapeThumbnail } from "../visuals.js";
import QrFieldHelp from "./QrFieldHelp.vue";
import QrVisualPicker from "./QrVisualPicker.vue";
const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  config: QrEditorConfig;
  controls: readonly QrEditorControls["shapes"][];
}>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
function patch(value: Partial<RenderQrSvgOptions>) {
  emit("update:design", { ...props.design, ...value });
}

const shapes = computed(() =>
  props.config.choices.artworkShape.map((value) => ({
    label: value === "square" ? props.messages.artworkSquare : props.messages.artworkCircle,
    value,
    source: qrShapeThumbnail("artwork", value),
  })),
);
const frameStyles = computed(() => {
  const labels = {
    none: props.messages.noFrame,
    outline: props.messages.solidFrame,
    dashed: props.messages.dashedFrame,
  };
  return props.config.choices.frameStyle.map((value) => ({ label: labels[value], value }));
});
const frame = computed(() => (typeof props.design.frame === "object" ? props.design.frame : {}));
const framed = computed(
  () =>
    props.design.frame !== undefined &&
    props.design.frame !== "none" &&
    frame.value.style !== "none",
);
</script>

<template>
  <div class="grid gap-3 @min-[38rem]:grid-cols-2">
    <div v-if="controls.includes('artworkShape')" class="space-y-1.5">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-medium text-highlighted">{{ messages.artworkShape }}</h4>
        <QrFieldHelp
          :label="messages.artworkShape"
          :text="messages.artworkHint"
          :action-label="messages.help"
        />
      </div>
      <QrVisualPicker
        :label="messages.artworkShape"
        :items="shapes"
        :model-value="design.shape ?? 'square'"
        @update:model-value="emit('update:design', changeQrArtworkShape(design, $event))"
      />
    </div>
    <div
      v-if="controls.includes('frame') || controls.includes('frameWidth')"
      class="grid grid-cols-2 content-start gap-3"
    >
      <UFormField
        v-if="controls.includes('frame')"
        :label="messages.frame"
        :class="framed ? undefined : 'col-span-2'"
      >
        <USelect
          :model-value="framed ? (frame.style ?? 'outline') : 'none'"
          :items="frameStyles"
          class="w-full"
          @update:model-value="
            patch({
              frame:
                $event === 'none'
                  ? 'none'
                  : {
                      ...frame,
                      style: $event,
                      color: frame.color ?? '#202833',
                      widthPx: frame.widthPx ?? 2,
                    },
            })
          "
        />
      </UFormField>
      <UFormField v-if="framed && controls.includes('frameWidth')" :label="messages.frameWidth">
        <UInput
          :model-value="frame.widthPx ?? 2"
          type="number"
          :min="config.ranges.frameWidth.min"
          :max="config.ranges.frameWidth.max"
          :step="config.ranges.frameWidth.step"
          class="w-full"
          @update:model-value="patch({ frame: { ...frame, widthPx: Number($event) } })"
        />
      </UFormField>
    </div>
  </div>
</template>
