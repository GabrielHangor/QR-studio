<script setup lang="ts">
import { computed } from "vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import { qrStyleSignature, type QrDesignPreset } from "../../editor/index.js";
import UAccordion from "@nuxt/ui/components/Accordion.vue";
import QrPaintControls from "./QrPaintControls.vue";
import QrFinderControls from "./QrFinderControls.vue";
import QrArtworkControls from "./QrArtworkControls.vue";
import QrCaptionControls from "./QrCaptionControls.vue";
import QrLogoControls from "./QrLogoControls.vue";
import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  presets: readonly QrDesignPreset[];
  logoBusy: boolean;
  logoIssue?: "logoFormat" | "logoTooLarge" | "logoInvalid";
}>();
const emit = defineEmits<{
  "update:design": [value: RenderQrSvgOptions];
  preset: [value: QrDesignPreset];
  uploadLogo: [value: File];
  removeLogo: [];
}>();
const groups = computed(() => [
  { label: props.messages.finders, slot: "finders" },
  { label: props.messages.artwork, slot: "artwork" },
  { label: props.messages.captions, slot: "captions" },
  { label: props.messages.logo, slot: "logo" },
]);

const selected = computed(
  () =>
    props.presets.find(
      (preset) => qrStyleSignature(preset.design) === qrStyleSignature(props.design),
    )?.id ?? "custom",
);
const presetItems = computed(() => [
  { label: props.messages.custom, value: "custom" },
  ...props.presets.map((preset) => ({ label: preset.title, value: preset.id })),
]);
const description = computed(
  () => props.presets.find((preset) => preset.id === selected.value)?.description,
);
function selectPreset(id: string) {
  const preset = props.presets.find((value) => value.id === id);
  if (preset) emit("preset", preset);
}
</script>

<template>
  <UCard>
    <template #header
      ><h3 class="font-semibold text-highlighted">{{ messages.design }}</h3></template
    >
    <UFormField v-if="presets.length" :label="messages.presets" :help="description" class="mb-5"
      ><USelect
        :model-value="selected"
        :items="presetItems"
        class="w-full"
        @update:model-value="selectPreset($event)"
    /></UFormField>
    <QrPaintControls
      :design="design"
      :messages="messages"
      @update:design="emit('update:design', $event)"
    />
    <UAccordion :items="groups" type="multiple" class="mt-4">
      <template #finders
        ><QrFinderControls
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
      /></template>
      <template #artwork
        ><QrArtworkControls
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
      /></template>
      <template #captions>
        <QrCaptionControls
          position="top"
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
        />
        <QrCaptionControls
          position="bottom"
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
        />
      </template>
      <template #logo
        ><QrLogoControls
          :busy="logoBusy"
          :issue="logoIssue"
          @upload="emit('uploadLogo', $event)"
          @remove="emit('removeLogo')"
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
      /></template>
    </UAccordion>
  </UCard>
</template>
