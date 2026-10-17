<script setup lang="ts">
import { computed, ref } from "vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import type { QrContentType, QrEditorExample } from "../../editor/index.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{
  contentType: QrContentType;
  url: string;
  text: string;
  invalidUrl: boolean;
  messages: QrEditorMessages;
  examples: readonly QrEditorExample[];
}>();
const emit = defineEmits<{
  "update:contentType": [value: QrContentType];
  "update:url": [value: string];
  "update:text": [value: string];
  example: [value: QrEditorExample];
}>();
// Interaction state belongs to the form; payload drafts remain owned by QrEditor.
const urlBlurred = ref(false);
const contentTypes = computed(() => [
  { label: props.messages.url, value: "url" },
  { label: props.messages.text, value: "text" },
]);
const selectedType = computed({
  get: () => props.contentType,
  set: (value: string | number) => emit("update:contentType", value === "text" ? "text" : "url"),
});
const fieldError = computed(() =>
  urlBlurred.value && props.invalidUrl ? props.messages.invalidUrl : undefined,
);
const exampleItems = computed(() =>
  props.examples.map((example) => ({ label: example.title, value: example.id })),
);
const selectedExample = computed(
  () =>
    props.examples.find(
      (example) =>
        example.contentType === props.contentType && example.value === props[props.contentType],
    )?.id,
);
function selectExample(id: string) {
  const example = props.examples.find((value) => value.id === id);
  if (example) emit("example", example);
}
</script>

<template>
  <UCard>
    <template #header
      ><h3 class="font-semibold text-highlighted">{{ messages.content }}</h3></template
    >
    <div class="space-y-5">
      <UFormField v-if="examples.length" :label="messages.examples"
        ><USelect
          :model-value="selectedExample"
          :placeholder="messages.examples"
          :items="exampleItems"
          class="w-full"
          @update:model-value="selectExample($event)"
      /></UFormField>
      <UTabs
        v-model="selectedType"
        :items="contentTypes"
        :content="false"
        class="w-full"
        :aria-label="messages.content"
      />
      <UFormField
        v-if="props.contentType === 'url'"
        :label="messages.url"
        :help="messages.urlHint"
        :error="fieldError"
        required
      >
        <UInput
          :model-value="props.url"
          type="url"
          placeholder="https://example.com"
          autocomplete="url"
          spellcheck="false"
          class="w-full"
          size="lg"
          @update:model-value="emit('update:url', String($event))"
          @blur="urlBlurred = true"
        />
      </UFormField>
      <UFormField v-else :label="messages.text" :help="messages.textHint" required>
        <UTextarea
          :model-value="props.text"
          :placeholder="messages.textPlaceholder"
          :rows="5"
          autoresize
          class="w-full"
          size="lg"
          @update:model-value="emit('update:text', String($event))"
        />
      </UFormField>
    </div>
  </UCard>
</template>
