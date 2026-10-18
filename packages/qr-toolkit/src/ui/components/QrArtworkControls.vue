<script setup lang="ts">
import { computed } from "vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import QrVisualPicker from "./QrVisualPicker.vue";
import { qrShapeThumbnail } from "../visuals.js";
import USelect from "@nuxt/ui/components/Select.vue";
import { changeQrArtworkShape } from "../../editor/index.js";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
const props = defineProps<{ design: RenderQrSvgOptions; messages: QrEditorMessages }>();
const emit = defineEmits<{ "update:design": [value: RenderQrSvgOptions] }>();
function patch(value: Partial<RenderQrSvgOptions>) {
  emit("update:design", { ...props.design, ...value });
}

const shapes = computed(() => [
  {
    label: props.messages.artworkSquare,
    value: "square" as const,
    source: qrShapeThumbnail("artwork", "square"),
  },
  {
    label: props.messages.artworkCircle,
    value: "circle" as const,
    source: qrShapeThumbnail("artwork", "circle"),
  },
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
    <div class="space-y-3">
      <h4 class="text-sm font-medium text-highlighted">{{ messages.artworkShape }}</h4>
      <QrVisualPicker
        :label="messages.artworkShape"
        :items="shapes"
        :model-value="design.shape ?? 'square'"
        @update:model-value="emit('update:design', changeQrArtworkShape(design, $event))"
      />
      <p class="text-sm text-muted">{{ messages.artworkHint }}</p>
    </div>
    <UFormField :label="messages.frame"
      ><USelect
        :model-value="framed ? (frame.style ?? 'outline') : 'none'"
        :items="[
          { label: messages.noFrame, value: 'none' as const },
          { label: messages.solidFrame, value: 'outline' as const },
          { label: messages.dashedFrame, value: 'dashed' as const },
        ]"
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
    /></UFormField>
    <div v-if="framed" class="grid grid-cols-2 gap-4">
      <UFormField :label="messages.frameWidth"
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
