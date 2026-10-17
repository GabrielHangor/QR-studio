<script setup lang="ts">
import { computed } from "vue";
import { createQrEditorState, type QrEditorState } from "../editor/index.js";
import { qrEditorMessagesRu, qrEditorMessagesEn, type QrEditorMessages } from "./messages.js";
import { useQrEditor } from "./useQrEditor.js";
import QrContentForm from "./components/QrContentForm.vue";
import QrDesignControls from "./components/QrDesignControls.vue";
import QrPreview from "./components/QrPreview.vue";

const props = withDefaults(defineProps<{ locale?: "ru" | "en"; messages?: QrEditorMessages }>(), {
  locale: "ru",
});
const model = defineModel<QrEditorState>({ default: createQrEditorState });
const messages = computed(
  () => props.messages ?? (props.locale === "en" ? qrEditorMessagesEn : qrEditorMessagesRu),
);
const { preview } = useQrEditor(model);

function update<K extends keyof QrEditorState>(key: K, value: QrEditorState[K]) {
  model.value = { ...model.value, [key]: value };
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

    <div class="grid items-start gap-6 md:grid-cols-2">
      <QrContentForm
        :content-type="model.contentType"
        :url="model.url"
        :text="model.text"
        :invalid-url="preview.status === 'invalid'"
        :messages="messages"
        class="min-w-0 md:col-start-1 md:row-start-1"
        @update:content-type="update('contentType', $event)"
        @update:url="update('url', $event)"
        @update:text="update('text', $event)"
      />
      <QrPreview
        :preview="preview"
        :messages="messages"
        class="min-w-0 md:col-start-2 md:row-start-1 md:row-span-3 md:sticky md:top-6"
      />
      <QrDesignControls
        :design="model.design"
        :messages="messages"
        class="min-w-0 md:col-start-1 md:row-start-2"
        @update:design="update('design', $event)"
      />
      <p class="text-sm text-muted md:col-start-1 md:row-start-3">{{ messages.privacy }}</p>
    </div>
  </section>
</template>
