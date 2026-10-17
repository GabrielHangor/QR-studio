<script setup lang="ts">
import { computed, ref } from "vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import UAlert from "@nuxt/ui/components/Alert.vue";
import { createQrEditorState, type QrEditorState } from "../editor/index.js";
import type { RenderQrSvgOptions } from "../engine/types.js";
import { formatQrError, formatQrDiagnostic } from "../i18n/index.js";
import { qrEditorMessagesRu, qrEditorMessagesEn, type QrEditorMessages } from "./messages.js";
import { useQrEditor } from "./useQrEditor.js";

const props = withDefaults(defineProps<{ locale?: "ru" | "en"; messages?: QrEditorMessages }>(), {
  locale: "ru",
});
const model = defineModel<QrEditorState>({ default: createQrEditorState });
const messages = computed(
  () => props.messages ?? (props.locale === "en" ? qrEditorMessagesEn : qrEditorMessagesRu),
);
const { preview } = useQrEditor(model);
const urlBlurred = ref(false);
const contentTypes = computed(() => [
  { label: messages.value.url, value: "url" },
  { label: messages.value.text, value: "text" },
]);
const moduleShapes = computed(() => [
  { label: messages.value.square, value: "square" as const },
  { label: messages.value.rounded, value: "rounded" as const },
  { label: messages.value.circle, value: "circle" as const },
]);
const contentType = computed({
  get: () => model.value.contentType,
  set: (value: string | number) => update("contentType", value === "text" ? "text" : "url"),
});
const fieldError = computed(() =>
  urlBlurred.value && preview.value.status === "invalid" ? messages.value.invalidUrl : undefined,
);
const foreground = computed(() => {
  const fill = model.value.design.foreground;
  return typeof fill === "string" ? fill : (fill?.startColor ?? "#000000");
});
const failure = computed(() =>
  preview.value.status === "error"
    ? formatQrError(preview.value.error, messages.value.engine)
    : undefined,
);
const diagnostics = computed(() =>
  preview.value.status === "ready" ? preview.value.analysis.diagnostics : [],
);
// An image document isolates SVG fragment IDs when several editors share the page.
// It needs neither DOM injection nor an object URL with a cleanup lifecycle.
const previewSource = computed(() =>
  preview.value.status === "ready"
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview.value.svg)}`
    : undefined,
);

function update<K extends keyof QrEditorState>(key: K, value: QrEditorState[K]) {
  model.value = { ...model.value, [key]: value };
}
function updateDesign<K extends keyof RenderQrSvgOptions>(key: K, value: RenderQrSvgOptions[K]) {
  update("design", { ...model.value.design, [key]: value });
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
      <UCard class="min-w-0 md:col-start-1 md:row-start-1">
        <template #header
          ><h3 class="font-semibold text-highlighted">{{ messages.content }}</h3></template
        >
        <div class="space-y-5">
          <UTabs
            v-model="contentType"
            :items="contentTypes"
            :content="false"
            class="w-full"
            :aria-label="messages.content"
          />
          <UFormField
            v-if="model.contentType === 'url'"
            :label="messages.url"
            :help="messages.urlHint"
            :error="fieldError"
            required
          >
            <UInput
              :model-value="model.url"
              type="url"
              placeholder="https://example.com"
              autocomplete="url"
              spellcheck="false"
              class="w-full"
              size="lg"
              @update:model-value="update('url', String($event))"
              @blur="urlBlurred = true"
            />
          </UFormField>
          <UFormField v-else :label="messages.text" :help="messages.textHint" required>
            <UTextarea
              :model-value="model.text"
              :placeholder="messages.textPlaceholder"
              :rows="5"
              autoresize
              class="w-full"
              size="lg"
              @update:model-value="update('text', String($event))"
            />
          </UFormField>
        </div>
      </UCard>
      <UCard
        class="min-w-0 md:col-start-2 md:row-start-1 md:row-span-3 md:sticky md:top-6"
        :aria-label="messages.preview"
      >
        <template #header
          ><h3 class="font-semibold text-highlighted">{{ messages.preview }}</h3></template
        >
        <div
          class="flex min-h-80 flex-col items-center justify-center gap-4 rounded-lg bg-elevated p-6 sm:p-8"
        >
          <img
            v-if="previewSource"
            :src="previewSource"
            :alt="messages.previewAlt"
            class="block h-auto w-full max-w-80"
          />
          <UAlert
            v-else-if="failure"
            color="error"
            :title="messages.generationError"
            :description="failure"
            role="alert"
          />
          <div v-else class="space-y-2 text-center" role="status">
            <p class="font-medium text-highlighted">{{ messages.emptyPreview }}</p>
            <p class="text-sm text-muted">
              {{ preview.status === "invalid" ? messages.invalidUrl : messages.emptyHint }}
            </p>
          </div>
        </div>
        <ul v-if="diagnostics.length" class="mt-4 space-y-3" aria-live="polite">
          <li v-for="diagnostic in diagnostics" :key="diagnostic.code">
            <UAlert
              :color="diagnostic.severity === 'error' ? 'error' : 'warning'"
              :description="formatQrDiagnostic(diagnostic, messages.engine)"
              variant="subtle"
            />
          </li>
        </ul>
        <template #footer
          ><p class="text-sm text-muted">{{ messages.staticHint }}</p></template
        >
      </UCard>
      <UCard class="min-w-0 md:col-start-1 md:row-start-2">
        <template #header
          ><h3 class="font-semibold text-highlighted">{{ messages.design }}</h3></template
        >
        <div class="space-y-5">
          <UFormField :label="messages.moduleShape">
            <USelect
              :model-value="model.design.moduleShape ?? 'square'"
              :items="moduleShapes"
              class="w-full"
              size="lg"
              @update:model-value="updateDesign('moduleShape', $event)"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="messages.foreground">
              <UInput
                :model-value="foreground"
                type="color"
                :ui="{ base: 'h-11 cursor-pointer p-1' }"
                class="w-full"
                size="lg"
                @update:model-value="updateDesign('foreground', String($event))"
              />
            </UFormField>
            <UFormField :label="messages.background">
              <UInput
                :model-value="model.design.background ?? '#ffffff'"
                type="color"
                :ui="{ base: 'h-11 cursor-pointer p-1' }"
                class="w-full"
                size="lg"
                @update:model-value="updateDesign('background', String($event))"
              />
            </UFormField>
          </div>
        </div>
      </UCard>
      <p class="text-sm text-muted md:col-start-1 md:row-start-3">{{ messages.privacy }}</p>
    </div>
  </section>
</template>
