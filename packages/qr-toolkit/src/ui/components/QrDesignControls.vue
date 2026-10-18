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
  { label: props.messages.finders, slot: "finders", value: "finders" },
  { label: props.messages.artwork, slot: "artwork", value: "artwork" },
  {
    label: props.messages.captions,
    slot: "captions",
    value: "captions",
    class: "@min-[38rem]:col-span-2",
  },
  { label: props.messages.logo, slot: "logo", value: "logo", class: "@min-[38rem]:col-span-2" },
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
  <UCard class="@container">
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
    <h4 class="mb-4 font-semibold text-highlighted">{{ messages.paint }}</h4>
    <QrPaintControls
      :design="design"
      :messages="messages"
      @update:design="emit('update:design', $event)"
    />
    <UAccordion
      :items="groups"
      type="multiple"
      :default-value="['finders', 'artwork']"
      class="mt-6 grid items-start gap-4 @min-[38rem]:grid-cols-2"
      :ui="{
        item: 'min-w-0 overflow-hidden rounded-xl border border-default last:border-b',
        header: 'bg-elevated/70',
        trigger:
          'px-4 py-4 text-base font-semibold text-highlighted hover:bg-elevated transition-colors',
        content: 'px-4 pt-4',
        trailingIcon: 'text-primary',
      }"
    >
      <template #finders
        ><p class="mb-4 text-sm text-muted">{{ messages.findersHint }}</p>
        <QrFinderControls
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
      /></template>
      <template #artwork
        ><p class="mb-4 text-sm text-muted">{{ messages.artworkHint }}</p>
        <QrArtworkControls
          :design="design"
          :messages="messages"
          @update:design="emit('update:design', $event)"
      /></template>
      <template #captions>
        <div class="grid gap-6 @min-[38rem]:grid-cols-2">
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
        </div>
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
