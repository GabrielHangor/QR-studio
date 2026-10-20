<script setup lang="ts">
import { computed } from "vue";

import type { QrEditorConfig, QrEditorControls } from "../../editor/config.js";
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

const outerItems = computed(() =>
  props.config.choices.finderOuter.map((value) => ({
    value,
    label: props.messages.shapeLabels[value],
    source: qrShapeThumbnail("outer", value),
  })),
);
const innerItems = computed(() =>
  props.config.choices.finderInner.map((value) => ({
    value,
    label: props.messages.shapeLabels[value],
    source: qrShapeThumbnail("inner", value),
  })),
);
function finder(value: Partial<NonNullable<RenderQrSvgOptions["finder"]>>) {
  patch({
    finder: {
      outerShape: props.design.finderShape ?? "square",
      innerShape:
        props.design.finder?.innerShape ??
        props.design.finder?.outerShape ??
        props.design.finderShape ??
        "square",
      ...props.design.finder,
      ...value,
    },
  });
}
</script>

<template>
  <div class="grid gap-3">
    <div v-if="controls.includes('finderOuter')" class="min-w-0 space-y-1.5">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-medium text-highlighted">{{ messages.finderOuter }}</h4>
        <QrFieldHelp
          :label="messages.finderOuter"
          :text="messages.findersHint"
          :action-label="messages.help"
        />
      </div>
      <QrVisualPicker
        compact
        hide-labels
        :label="messages.finderOuter"
        :items="outerItems"
        :model-value="design.finder?.outerShape ?? design.finderShape ?? 'square'"
        @update:model-value="finder({ outerShape: $event })"
      />
    </div>
    <div v-if="controls.includes('finderInner')" class="min-w-0 space-y-1.5">
      <h4 class="text-sm font-medium text-highlighted">{{ messages.finderInner }}</h4>
      <QrVisualPicker
        compact
        hide-labels
        :label="messages.finderInner"
        :items="innerItems"
        :model-value="
          design.finder?.innerShape ?? design.finder?.outerShape ?? design.finderShape ?? 'square'
        "
        @update:model-value="finder({ innerShape: $event })"
      />
    </div>
  </div>
</template>
