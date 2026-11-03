<script setup lang="ts">
import UButton from "@nuxt/ui/components/Button.vue";
import UColorPicker from "@nuxt/ui/components/ColorPicker.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import UPopover from "@nuxt/ui/components/Popover.vue";
import * as v from "valibot";
import { computed, ref, watch } from "vue";

const props = defineProps<{ modelValue: string; label: string; palette: readonly string[] }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const color = computed(() =>
  /^#[\da-f]{3}$/i.test(props.modelValue)
    ? "#" + Array.from(props.modelValue.slice(1), (value) => value + value).join("")
    : props.modelValue,
);
const hexSchema = v.pipe(v.string(), v.regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i));
function normalizeHex(value: string) {
  const hex = value.toLowerCase();
  return /^#[\da-f]{3}$/.test(hex)
    ? "#" + Array.from(hex.slice(1), (char) => char + char).join("")
    : hex;
}
const hexDraft = ref(color.value);
const hexValid = computed(() => v.is(hexSchema, hexDraft.value));
watch(
  () => props.modelValue,
  (value) => {
    if (normalizeHex(value) !== normalizeHex(hexDraft.value)) hexDraft.value = color.value;
  },
);
function updateHex(value: string | number) {
  hexDraft.value = String(value);
  const parsed = v.safeParse(hexSchema, hexDraft.value);
  if (parsed.success) emit("update:modelValue", parsed.output);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UPopover :content="{ align: 'start' }">
      <UButton :aria-label="label" color="neutral" class="font-mono text-xs">
        <template #leading>
          <span
            :style="{ backgroundColor: color }"
            class="size-5 shrink-0 rounded border border-accented"
          />
        </template>
        {{ color.toUpperCase() }}
      </UButton>
      <template #content>
        <div class="grid gap-3 p-3">
          <UColorPicker
            :model-value="color"
            format="hex"
            :aria-label="label"
            @update:model-value="
              $event &&
              normalizeHex($event) !== normalizeHex(modelValue) &&
              emit('update:modelValue', $event)
            "
          />
          <UFormField :label="label + ' (HEX)'" :error="hexValid ? undefined : '#RGB / #RRGGBB'">
            <UInput
              :model-value="hexDraft"
              :maxlength="7"
              autocomplete="off"
              spellcheck="false"
              class="w-full"
              :ui="{ base: 'font-mono' }"
              @update:model-value="updateHex"
            />
          </UFormField>
        </div>
      </template>
    </UPopover>
    <div
      v-if="palette.length"
      class="flex flex-wrap gap-1"
      role="group"
      :aria-label="label + ' (HEX)'"
    >
      <button
        v-for="value in palette"
        :key="value"
        type="button"
        :aria-label="label + ' ' + value"
        :aria-pressed="color.toLowerCase() === value.toLowerCase()"
        :style="{ backgroundColor: value }"
        class="size-8 shrink-0 rounded-md border border-accented outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
        :class="
          color.toLowerCase() === value.toLowerCase()
            ? 'ring-2 ring-primary ring-offset-1 ring-offset-default'
            : ''
        "
        @click="emit('update:modelValue', value)"
      >
        <span class="sr-only">{{ value }}</span>
      </button>
    </div>
  </div>
</template>
