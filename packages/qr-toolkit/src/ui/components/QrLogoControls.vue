<script setup lang="ts">
import UAlert from "@nuxt/ui/components/Alert.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USlider from "@nuxt/ui/components/Slider.vue";
import USwitch from "@nuxt/ui/components/Switch.vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";
import { computed, ref, watch } from "vue";

import type { QrEditorConfig, QrEditorControls } from "../../editor/config.js";
import type { QrLogoPreset } from "../../editor/index.js";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import { isQrLogoDataUri } from "../browser.js";
import type { QrEditorMessages } from "../messages.js";
import QrFieldHelp from "./QrFieldHelp.vue";
import QrVisualPicker from "./QrVisualPicker.vue";
const props = defineProps<{
  design: RenderQrSvgOptions;
  presets: readonly QrLogoPreset[];
  messages: QrEditorMessages;
  config: QrEditorConfig;
  controls: readonly QrEditorControls["logo"][];
  busy: boolean;
  issue?: "logoFormat" | "logoTooLarge" | "logoInvalid";
}>();
const emit = defineEmits<{
  "update:design": [value: RenderQrSvgOptions];
  "upload": [value: File];
  "preset": [value: QrLogoPreset];
  "remove": [];
}>();
const selected = computed(() =>
  props.presets.find((preset) => preset.dataUri === props.design.logo?.dataUri),
);
const category = ref("");
const groups = computed(() =>
  [...new Set(props.presets.map((preset) => preset.group ?? ""))].map((value) => ({
    value,
    label: value || props.messages.logoPresets,
  })),
);
const activeGroup = computed({
  get: () =>
    groups.value.some((group) => group.value === category.value)
      ? category.value
      : (groups.value[0]?.value ?? ""),
  set: (value: string | number) => {
    category.value = String(value);
  },
});
watch(
  selected,
  (preset) => {
    if (preset) category.value = preset.group ?? "";
  },
  { immediate: true },
);
const items = computed(() => [
  { value: "none", label: props.messages.noLogo },
  ...props.presets
    .filter((preset) => (preset.group ?? "") === activeGroup.value)
    .map((preset) => ({
      value: `preset:${preset.id}`,
      label: preset.title,
      source: isQrLogoDataUri(preset.dataUri) ? preset.dataUri : undefined,
    })),
]);
function choose(value: string) {
  if (value === "none") {
    emit("remove");
    return;
  }
  const preset = props.presets.find((item) => `preset:${item.id}` === value);
  if (preset) emit("preset", preset);
}
function patchLogo(value: Partial<NonNullable<RenderQrSvgOptions["logo"]>>) {
  if (props.design.logo) {
    emit("update:design", { ...props.design, logo: { ...props.design.logo, ...value } });
  }
}
function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit("upload", file);
  input.value = "";
}
</script>
<template>
  <div class="@container space-y-4 pb-4">
    <UFormField v-if="controls.includes('presets') && presets.length" :label="messages.logoPresets">
      <div class="space-y-3">
        <UTabs
          v-if="groups.length > 1"
          v-model="activeGroup"
          :items="groups"
          :content="false"
          :aria-label="messages.logoPresetGroups"
        />
        <QrVisualPicker
          :label="messages.logoPresets"
          :items="items"
          :model-value="design.logo ? (selected ? `preset:${selected.id}` : undefined) : 'none'"
          @update:model-value="choose"
        />
      </div>
    </UFormField>
    <div v-if="design.logo && !selected" class="flex items-center gap-3 text-sm text-muted">
      <img
        v-if="isQrLogoDataUri(design.logo.dataUri)"
        :src="design.logo.dataUri"
        :alt="messages.customLogo"
        class="size-12 rounded-md bg-default object-contain p-1 ring ring-default"
      />
      <span>{{ messages.customLogo }}</span>
    </div>
    <p
      v-if="!design.logo && !busy && !issue && (!controls.includes('presets') || !presets.length)"
      class="text-sm text-muted"
    >
      {{ messages.noLogo }}
    </p>
    <UFormField
      v-if="controls.includes('upload')"
      :label="messages.logoFile"
      :help="messages.logoHelp"
    >
      <UInput
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="w-full"
        @change="upload"
      />
    </UFormField>
    <UAlert v-if="issue" color="error" :description="messages[issue]" role="alert" />
    <USwitch
      v-if="design.logo && controls.includes('clearBackground')"
      :model-value="design.logo.clearBackground ?? true"
      :label="messages.clearLogo"
      @update:model-value="patchLogo({ clearBackground: $event })"
    />
    <template v-if="design.logo">
      <UFormField v-if="controls.includes('size')" :label="messages.logoSize">
        <USlider
          :model-value="design.logo.widthModules"
          :min="config.ranges.logoSize.min"
          :max="config.ranges.logoSize.max"
          :step="config.ranges.logoSize.step"
          :aria-label="messages.logoSize"
          class="my-3"
          @update:model-value="patchLogo({ widthModules: $event })"
        />
        <div class="flex justify-between text-xs text-muted">
          <span>{{ messages.smaller }}</span>
          <span>{{ messages.larger }}</span>
        </div>
      </UFormField>
      <details v-if="controls.includes('size') || controls.includes('padding')">
        <summary class="cursor-pointer py-2 text-sm font-medium text-highlighted">
          {{ messages.advanced }}
        </summary>
        <div class="mt-3 grid grid-cols-2 gap-4">
          <UFormField v-if="controls.includes('size')" :label="messages.logoWidth">
            <template #hint>
              <QrFieldHelp
                :label="messages.logoWidth"
                :text="messages.logoSizeHint"
                :action-label="messages.help"
              />
            </template>
            <UInput
              type="number"
              :min="config.ranges.logoSize.min"
              :max="config.ranges.logoSize.max"
              :step="config.ranges.logoSize.step"
              :model-value="design.logo.widthModules"
              class="w-full"
              @update:model-value="patchLogo({ widthModules: Number($event) })"
            />
          </UFormField>
          <UFormField
            v-if="design.logo.clearBackground !== false && controls.includes('padding')"
            :label="messages.logoPadding"
          >
            <UInput
              type="number"
              :min="config.ranges.logoPadding.min"
              :max="config.ranges.logoPadding.max"
              :step="config.ranges.logoPadding.step"
              :model-value="design.logo.paddingModules ?? 0.5"
              class="w-full"
              @update:model-value="patchLogo({ paddingModules: Number($event) })"
            />
          </UFormField>
        </div>
      </details>
    </template>
    <UButton
      v-if="controls.includes('remove') && (design.logo || busy || issue)"
      color="neutral"
      :label="messages.removeLogo"
      @click="emit('remove')"
    />
  </div>
</template>
