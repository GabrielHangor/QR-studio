<script setup lang="ts">
import UAccordion from "@nuxt/ui/components/Accordion.vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";
import { computed, ref } from "vue";

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
import { qrEditorMessagesRu, qrEditorMessagesEn, type QrEditorMessages } from "./messages.js";
import { useQrEditor, type QrEditorPreview } from "./useQrEditor.js";
import { useQrLogo } from "./useQrLogo.js";

const props = withDefaults(
  defineProps<{
    locale?: "ru" | "en";
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
const open = ref<string | undefined>("content");
const sections = computed(() => [
  { label: messages.value.content, slot: "content", value: "content" },
  ...(props.presets.length
    ? [{ label: messages.value.presets, slot: "presets", value: "presets" }]
    : []),
  { label: messages.value.paint, slot: "colors", value: "colors" },
  { label: messages.value.shapes, slot: "shapes", value: "shapes" },
  { label: messages.value.logo, slot: "logo", value: "logo" },
  { label: messages.value.captions, slot: "captions", value: "captions" },
  { label: messages.value.technical, slot: "technical", value: "technical" },
]);
const contentTypes = computed(() => [
  { label: messages.value.url, value: "url" },
  { label: messages.value.text, value: "text" },
]);
const contentType = computed({
  get: () => model.value.contentType,
  set: (value: string | number) => {
    update("contentType", value === "text" ? "text" : "url");
    open.value = "content";
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
      class="w-full sm:w-80"
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
            header: 'bg-elevated/50',
            trigger:
              'px-4 py-3.5 text-sm font-semibold text-highlighted hover:bg-elevated transition-colors',
            content: 'px-4 data-[state=open]:py-4',
            trailingIcon: 'text-primary',
          }"
        >
          <template #content>
            <QrContentForm
              :content-type="model.contentType"
              :url="model.url"
              :text="model.text"
              :invalid-url="preview.status === 'invalid'"
              :messages="messages"
              @update:url="update('url', $event)"
              @update:text="update('text', $event)"
            />
          </template>
          <template #presets>
            <QrPresetPicker
              :presets="props.presets"
              :design="model.design"
              :messages="messages"
              @preset="model = applyQrPreset(model, $event)"
            />
          </template>
          <template #colors>
            <QrPaintControls
              :design="model.design"
              :messages="messages"
              @update:design="update('design', $event)"
            />
          </template>
          <template #shapes>
            <QrShapeControls
              :design="model.design"
              :messages="messages"
              @update:design="update('design', $event)"
            />
          </template>
          <template #logo>
            <QrLogoControls
              :busy="logo.busy.value"
              :issue="logo.issue.value"
              :design="model.design"
              :messages="messages"
              @upload="logo.upload"
              @remove="logo.remove"
              @update:design="update('design', $event)"
            />
          </template>
          <template #captions>
            <div class="grid gap-5 sm:grid-cols-2">
              <QrCaptionControls
                position="top"
                :design="model.design"
                :messages="messages"
                @update:design="update('design', $event)"
              />
              <QrCaptionControls
                position="bottom"
                :design="model.design"
                :messages="messages"
                @update:design="update('design', $event)"
              />
            </div>
          </template>
          <template #technical>
            <QrEncodingControls
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
        :preview="preview"
        :design="model.design"
        :messages="messages"
        class="min-w-0 lg:sticky lg:top-5"
        @update:design="update('design', $event)"
      />
    </div>
  </section>
</template>
