<script setup lang="ts">
import UAccordion from "@nuxt/ui/components/Accordion.vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";
import { computed, ref, watch } from "vue";

import {
  qrSectionControls,
  type QrEditorConfig,
  type QrEditorSectionId,
} from "../editor/config.js";
import {
  createQrEditorState,
  applyQrPreset,
  type QrEditorState,
  type QrDesignPreset,
} from "../editor/index.js";
import { QrBrowserError } from "./browser.js";
import QrCaptionControls from "./components/QrCaptionControls.vue";
import QrContentForm from "./components/QrContentForm.vue";
import QrEncodingControls from "./components/QrEncodingControls.vue";
import QrLogoControls from "./components/QrLogoControls.vue";
import QrPaintControls from "./components/QrPaintControls.vue";
import QrPresetPicker from "./components/QrPresetPicker.vue";
import QrPreview from "./components/QrPreview.vue";
import QrShapeControls from "./components/QrShapeControls.vue";
import type { QrLocationSearch } from "./geocoding.js";
import { qrEditorMessagesRu, qrEditorMessagesEn, type QrEditorMessages } from "./messages.js";
import { useQrEditor, type QrEditorPreview } from "./useQrEditor.js";
import { useQrLogo } from "./useQrLogo.js";

const props = withDefaults(
  defineProps<{
    config: QrEditorConfig;
    locale?: "ru" | "en";
    locationSearch?: QrLocationSearch;
    messages?: QrEditorMessages;
    presets?: readonly QrDesignPreset[];
  }>(),
  {
    locale: "ru",
    presets: () => [],
  },
);
const model = defineModel<QrEditorState>({ default: createQrEditorState });
const messages = computed(
  () => props.messages ?? (props.locale === "en" ? qrEditorMessagesEn : qrEditorMessagesRu),
);
const { preview: generatedPreview } = useQrEditor(model);
const logo = useQrLogo(model);
const preview = computed<QrEditorPreview>(() => {
  if (logo.busy.value) return { status: "loading" };
  if (logo.issue.value) return { status: "error", error: new QrBrowserError(logo.issue.value) };
  return generatedPreview.value;
});

function update<K extends keyof QrEditorState>(key: K, value: QrEditorState[K]) {
  model.value = { ...model.value, [key]: value };
}
const open = ref<string>();
let sectionsInitialized = false;
const sections = computed(() => {
  const labels: Record<QrEditorSectionId, string> = {
    content: messages.value.content,
    presets: messages.value.presets,
    colors: messages.value.paint,
    shapes: messages.value.shapes,
    logo: messages.value.logo,
    captions: messages.value.captions,
    technical: messages.value.technical,
  };
  return props.config.sections
    .filter((section) => {
      if (section.id === "presets") return props.presets.length > 0;
      return section.id === "content" || section.controls.length > 0;
    })
    .map((section) => ({ label: labels[section.id], slot: section.id, value: section.id }));
});
function controls<K extends QrEditorSectionId>(id: K) {
  return qrSectionControls(props.config, id);
}
watch(
  () => [props.config.contentTypes.slice(), model.value.contentType] as const,
  () => {
    if (!props.config.contentTypes.includes(model.value.contentType)) {
      update("contentType", props.config.contentTypes[0]);
    }
  },
  { immediate: true },
);
watch(
  sections,
  (items) => {
    if (sectionsInitialized && open.value === undefined) return;
    sectionsInitialized = true;
    if (!items.some((item) => item.value === open.value)) {
      open.value =
        items.find((item) => item.value === props.config.initialSection)?.value ?? items[0]?.value;
    }
  },
  { immediate: true },
);
const contentTypes = computed(() =>
  props.config.contentTypes.map((value) => ({
    label: messages.value.contentLabels[value],
    value,
  })),
);
const contentType = computed({
  get: () => model.value.contentType,
  set: (value: string | number) => {
    const type = props.config.contentTypes.find((type) => type === value);
    if (!type) return;
    update("contentType", type);
    if (sections.value.some((section) => section.value === "content")) open.value = "content";
  },
});
</script>

<template>
  <section :aria-label="messages.title" class="flex flex-col gap-4">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
        {{ messages.title }}
      </h2>
      <p class="text-sm text-muted">{{ messages.introduction }}</p>
    </header>
    <UTabs
      v-model="contentType"
      :items="contentTypes"
      :content="false"
      :aria-label="messages.contentType"
      class="w-fit"
      :ui="{
        list: 'flex-wrap justify-start gap-1 bg-default ring ring-default',
        indicator: 'hidden',
        trigger: 'flex-none px-3 data-[state=active]:bg-selected data-[state=active]:text-primary',
      }"
    />
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(22rem,1fr)]">
      <div class="min-w-0 space-y-3">
        <UAccordion
          v-model="open"
          :items="sections"
          type="single"
          :unmount-on-hide="false"
          :aria-label="messages.settings"
          class="@container space-y-2"
          :ui="{
            item: 'min-w-0 overflow-hidden rounded-xl border border-default last:border-b bg-default',
            header: 'bg-default',
            trigger:
              'px-4 py-3.5 text-sm font-semibold text-highlighted hover:bg-muted data-[state=open]:bg-muted transition-colors',
            content: 'overflow-hidden',
            body: 'p-4',
            trailingIcon: 'text-muted',
          }"
        >
          <template #content-body>
            <QrContentForm
              :state="model"
              :controls="controls('content')"
              :location-search="props.locationSearch"
              :messages="messages"
              @update:state="model = $event"
            />
          </template>
          <template #presets-body>
            <QrPresetPicker
              :presets="props.presets"
              :design="model.design"
              :messages="messages"
              @preset="model = applyQrPreset(model, $event)"
            />
          </template>
          <template #colors-body>
            <QrPaintControls
              :config="config"
              :controls="controls('colors')"
              :design="model.design"
              :messages="messages"
              @update:design="update('design', $event)"
            />
          </template>
          <template #shapes-body>
            <QrShapeControls
              :config="config"
              :controls="controls('shapes')"
              :design="model.design"
              :messages="messages"
              @update:design="update('design', $event)"
            />
          </template>
          <template #logo-body>
            <QrLogoControls
              :config="config"
              :controls="controls('logo')"
              :busy="logo.busy.value"
              :issue="logo.issue.value"
              :design="model.design"
              :messages="messages"
              @upload="logo.upload"
              @remove="logo.remove"
              @update:design="update('design', $event)"
            />
          </template>
          <template #captions-body>
            <div class="grid gap-5 sm:grid-cols-2">
              <QrCaptionControls
                :config="config"
                :controls="controls('captions')"
                v-if="controls('captions').includes('top')"
                position="top"
                :design="model.design"
                :messages="messages"
                @update:design="update('design', $event)"
              />
              <QrCaptionControls
                :config="config"
                :controls="controls('captions')"
                v-if="controls('captions').includes('bottom')"
                position="bottom"
                :design="model.design"
                :messages="messages"
                @update:design="update('design', $event)"
              />
            </div>
          </template>
          <template #technical-body>
            <QrEncodingControls
              :config="config"
              :controls="controls('technical')"
              :encoding="model.encoding"
              :design="model.design"
              :messages="messages"
              @update:encoding="update('encoding', $event)"
              @update:design="update('design', $event)"
            />
          </template>
        </UAccordion>
        <p class="text-xs text-muted">{{ messages.privacy }}</p>
      </div>
      <QrPreview
        :config="config"
        :preview="preview"
        :design="model.design"
        :messages="messages"
        class="min-w-0 lg:sticky lg:top-5"
        @update:design="update('design', $event)"
      />
    </div>
  </section>
</template>
