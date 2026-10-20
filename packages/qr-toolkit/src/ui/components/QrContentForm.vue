<script setup lang="ts">
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import { computed, defineAsyncComponent, ref } from "vue";

import type { QrEditorControls } from "../../editor/config.js";
import {
  createQrEditorState,
  qrContentFieldIssues,
  type QrEditorState,
  type QrContentField,
  type QrStructuredContentType,
} from "../../editor/index.js";
import type { QrLocationSearch } from "../geocoding.js";
import type { QrEditorMessages } from "../messages.js";

const QrLocationPicker = defineAsyncComponent(() => import("./QrLocationPicker.vue"));
const props = defineProps<{
  state: QrEditorState;
  controls: readonly QrEditorControls["content"][];
  messages: QrEditorMessages;
  locationSearch?: QrLocationSearch;
}>();
const emit = defineEmits<{ "update:state": [value: QrEditorState] }>();
const touched = ref<Record<string, boolean>>({});
function touch(field: string) {
  touched.value[`${props.state.contentType}.${field}`] = true;
}
const errors = computed(() => {
  const type = props.state.contentType;
  let value: unknown = props.state.contentDrafts?.[type as QrStructuredContentType] ?? {};
  if (type === "url") value = { url: props.state.url };
  if (type === "text") value = { text: props.state.text };
  return qrContentFieldIssues(type, value);
});
function fieldError(field: string) {
  const code = errors.value[field];
  return touched.value[`${props.state.contentType}.${field}`] && code
    ? props.messages.validation[code]
    : undefined;
}
const initial = createQrEditorState();
const isInitialContent = computed(() => {
  const type = props.state.contentType;
  if (type === "url" || type === "text") return props.state[type] === initial[type];
  return (
    JSON.stringify(props.state.contentDrafts?.[type]) ===
    JSON.stringify(initial.contentDrafts?.[type])
  );
});
const fieldsByType: Record<QrStructuredContentType, QrContentField[]> = {
  email: ["email", "subject", "body"],
  phone: ["phone"],
  sms: ["phone", "body"],
  wifi: ["ssid", "security", "password", "hidden"],
  contact: ["name", "organization", "phone", "email"],
  location: ["latitude", "longitude"],
};
const structuredType = computed(() => {
  const type = props.state.contentType;
  return type === "url" || type === "text" ? undefined : type;
});
const draft = computed(() =>
  structuredType.value ? (props.state.contentDrafts?.[structuredType.value] ?? {}) : {},
);
const fields = computed(() =>
  structuredType.value
    ? fieldsByType[structuredType.value].filter(
        (field) => field !== "password" || draft.value.security !== "nopass",
      )
    : [],
);
function updateField(field: QrContentField, value: string) {
  const type = structuredType.value;
  if (!type) return;
  emit("update:state", {
    ...props.state,
    contentDrafts: { ...props.state.contentDrafts, [type]: { ...draft.value, [field]: value } },
  });
}
function selectPoint(point: { latitude: string; longitude: string }) {
  emit("update:state", {
    ...props.state,
    contentDrafts: {
      ...props.state.contentDrafts,
      location: { ...props.state.contentDrafts?.location, ...point },
    },
  });
}
function inputType(field: QrContentField) {
  const types: Partial<Record<QrContentField, "password" | "email" | "tel">> = {
    password: "password",
    email: "email",
    phone: "tel",
  };
  return types[field] ?? "text";
}
function placeholder(field: QrContentField) {
  if (field === "latitude") return "55.7558";
  if (field === "longitude") return "37.6173";
}
function required(field: QrContentField) {
  return (
    field === "ssid" ||
    field === "latitude" ||
    field === "longitude" ||
    field === "name" ||
    field === "password" ||
    (field === "email" && structuredType.value === "email") ||
    (field === "phone" && (structuredType.value === "phone" || structuredType.value === "sms"))
  );
}
</script>

<template>
  <div class="space-y-3">
    <UFormField
      v-if="state.contentType === 'url'"
      :label="messages.url"
      :error="fieldError('url')"
      name="url"
      required
    >
      <UInput
        :model-value="state.url"
        type="url"
        placeholder="https://example.com"
        autocomplete="url"
        spellcheck="false"
        class="w-full"
        size="lg"
        @update:model-value="emit('update:state', { ...state, url: String($event) })"
        @blur="touch('url')"
      />
    </UFormField>
    <UFormField
      v-else-if="state.contentType === 'text'"
      :label="messages.text"
      :error="fieldError('text')"
      name="text"
      required
    >
      <UTextarea
        :model-value="state.text"
        @blur="touch('text')"
        :placeholder="messages.textPlaceholder"
        :rows="5"
        autoresize
        class="w-full"
        size="lg"
        @update:model-value="emit('update:state', { ...state, text: String($event) })"
      />
    </UFormField>
    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField
          v-for="field in fields"
          :key="`${state.contentType}-${field}`"
          :name="field"
          :error="fieldError(field)"
          :label="messages.contentFields[field]"
          :required="required(field)"
          :class="field === 'body' ? 'sm:col-span-2' : undefined"
        >
          <USelect
            v-if="field === 'security'"
            :aria-label="messages.contentFields[field]"
            @blur="touch(field)"
            :model-value="draft.security ?? 'WPA'"
            :items="[
              { label: 'WPA / WPA2 / WPA3', value: 'WPA' },
              { label: 'WEP', value: 'WEP' },
              { label: messages.noPassword, value: 'nopass' },
            ]"
            class="w-full"
            @update:model-value="updateField(field, String($event))"
          />
          <USelect
            v-else-if="field === 'hidden'"
            :aria-label="messages.contentFields[field]"
            @blur="touch(field)"
            :model-value="draft.hidden ?? 'false'"
            :items="[
              { label: messages.visibleNetwork, value: 'false' },
              { label: messages.hiddenNetwork, value: 'true' },
            ]"
            class="w-full"
            @update:model-value="updateField(field, String($event))"
          />
          <UTextarea
            v-else-if="field === 'body'"
            :aria-label="messages.contentFields[field]"
            @blur="touch(field)"
            :model-value="draft[field] ?? ''"
            :rows="3"
            class="w-full"
            @update:model-value="updateField(field, String($event))"
          />
          <UInput
            v-else
            :aria-label="messages.contentFields[field]"
            @blur="touch(field)"
            :model-value="draft[field] ?? ''"
            :type="inputType(field)"
            :inputmode="field === 'latitude' || field === 'longitude' ? 'decimal' : undefined"
            :placeholder="placeholder(field)"
            :autocomplete="field === 'password' ? 'off' : undefined"
            class="w-full"
            @update:model-value="updateField(field, String($event))"
          />
        </UFormField>
      </div>
      <QrLocationPicker
        v-if="structuredType === 'location' && controls.includes('locationMap')"
        :draft="draft"
        :show-search="controls.includes('locationSearch')"
        :location-search="locationSearch"
        :messages="messages"
        @select="selectPoint"
      />
      <p class="text-xs text-muted">{{ messages.staticContentHint }}</p>
    </template>
    <p v-if="controls.includes('sampleHint') && isInitialContent" class="text-sm text-muted">
      {{ messages.sampleHint }}
    </p>
  </div>
</template>
