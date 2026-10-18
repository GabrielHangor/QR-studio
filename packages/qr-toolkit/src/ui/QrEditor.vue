<script setup lang="ts">
import UCard from "@nuxt/ui/components/Card.vue";
import { computed } from "vue";
import {
  createQrEditorState,
  applyQrPreset,
  type QrEditorState,
  type QrDesignPreset,
  type QrEditorExample,
} from "../editor/index.js";
import { qrEditorMessagesRu, qrEditorMessagesEn, type QrEditorMessages } from "./messages.js";
import { useQrLogo } from "./useQrLogo.js";
import { QrBrowserError } from "./browser.js";
import { useQrEditor, type QrEditorPreview } from "./useQrEditor.js";
import QrContentForm from "./components/QrContentForm.vue";
import QrDesignControls from "./components/QrDesignControls.vue";
import QrEncodingControls from "./components/QrEncodingControls.vue";
import QrPreview from "./components/QrPreview.vue";

const props = withDefaults(
  defineProps<{
    locale?: "ru" | "en";
    messages?: QrEditorMessages;
    presets?: readonly QrDesignPreset[];
    examples?: readonly QrEditorExample[];
  }>(),
  {
    locale: "ru",
    presets: () => [],
    examples: () => [],
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
function applyExample(example: QrEditorExample) {
  model.value = {
    ...model.value,
    contentType: example.contentType,
    [example.contentType]: example.value,
    encoding: { ...model.value.encoding, version: example.version },
  };
}
</script>

<template>
  <section :aria-label="messages.title" class="flex flex-col gap-6">
    <header class="space-y-2">
      <h2 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
        {{ messages.title }}
      </h2>
      <p class="text-muted">{{ messages.introduction }}</p>
    </header>

    <div
      class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] min-[90rem]:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.7fr)_minmax(20rem,1fr)]"
    >
      <QrContentForm
        :examples="props.examples"
        :content-type="model.contentType"
        :url="model.url"
        :text="model.text"
        :invalid-url="preview.status === 'invalid'"
        :messages="messages"
        class="min-w-0 lg:col-start-1 lg:row-start-1"
        @update:content-type="update('contentType', $event)"
        @example="applyExample"
        @update:url="update('url', $event)"
        @update:text="update('text', $event)"
      />
      <QrPreview
        :preview="preview"
        :messages="messages"
        class="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:sticky lg:top-6 min-[90rem]:col-start-3"
      />
      <QrDesignControls
        :logo-busy="logo.busy.value"
        :logo-issue="logo.issue.value"
        @upload-logo="logo.upload"
        @remove-logo="logo.remove"
        :presets="props.presets"
        :design="model.design"
        :messages="messages"
        class="min-w-0 lg:col-start-1 lg:row-start-2 min-[90rem]:col-start-2 min-[90rem]:row-start-1 min-[90rem]:row-span-4"
        @preset="model = applyQrPreset(model, $event)"
        @update:design="update('design', $event)"
      />
      <UCard class="min-w-0 lg:col-start-1 lg:row-start-3 min-[90rem]:row-start-2">
        <template #header>
          <h3 class="font-semibold text-highlighted">{{ messages.technical }}</h3>
        </template>
        <QrEncodingControls
          :encoding="model.encoding"
          :design="model.design"
          :messages="messages"
          @update:encoding="update('encoding', $event)"
          @update:design="update('design', $event)"
        />
      </UCard>
      <p class="text-sm text-muted lg:col-start-1 lg:row-start-4 min-[90rem]:row-start-3">
        {{ messages.privacy }}
      </p>
    </div>
  </section>
</template>
