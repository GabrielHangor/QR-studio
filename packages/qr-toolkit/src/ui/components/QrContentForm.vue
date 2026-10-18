<script setup lang="ts">
import { computed, ref } from "vue";
import UInput from "@nuxt/ui/components/Input.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import { createQrEditorState } from "../../editor/index.js";
import type { QrContentType } from "../../editor/index.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{
  contentType: QrContentType;
  url: string;
  text: string;
  invalidUrl: boolean;
  messages: QrEditorMessages;
}>();
const emit = defineEmits<{
  "update:url": [value: string];
  "update:text": [value: string];
}>();
// Interaction state belongs to the form; payload drafts remain owned by QrEditor.
const urlBlurred = ref(false);
const initial = createQrEditorState();
const isInitialContent = computed(() => props[props.contentType] === initial[props.contentType]);
const fieldError = computed(() =>
  urlBlurred.value && props.invalidUrl ? props.messages.invalidUrl : undefined,
);
</script>

<template>
  <div class="space-y-3">
    <UFormField
      v-if="props.contentType === 'url'"
      :label="messages.url"
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
    <UFormField v-else :label="messages.text" required>
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
    <p v-if="isInitialContent" class="text-sm text-muted">{{ messages.sampleHint }}</p>
  </div>
</template>
