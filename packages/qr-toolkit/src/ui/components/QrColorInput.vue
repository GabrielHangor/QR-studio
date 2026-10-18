<script setup lang="ts">
import { computed } from "vue";
import UInput from "@nuxt/ui/components/Input.vue";

const props = defineProps<{ modelValue: string; label: string; light?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
// Dark inks and pale papers complement the exported QR's opaque backgrounds.
const palette = computed(() =>
  props.light
    ? ["#ffffff", "#faf6ed", "#f1f5f9", "#f5f3ff", "#f0fdf4", "#fff7ed", "#fff1f2", "#e2e8f0"]
    : ["#202833", "#173d51", "#1e40af", "#5b21b6", "#166534", "#115e59", "#9f1239", "#78350f"],
);
const color = computed(() =>
  /^#[\da-f]{3}$/i.test(props.modelValue)
    ? "#" + Array.from(props.modelValue.slice(1), (value) => value + value).join("")
    : props.modelValue,
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2">
      <UInput
        :model-value="color"
        :aria-label="label"
        type="color"
        :ui="{ base: 'size-9 cursor-pointer p-1' }"
        class="w-9 shrink-0"
        @update:model-value="emit('update:modelValue', String($event))"
      />
      <span class="min-w-16 font-mono text-xs text-muted">{{ color.toUpperCase() }}</span>
    </div>
    <div class="flex flex-wrap gap-1" role="group" :aria-label="label + ' (HEX)'">
      <button
        v-for="value in palette"
        :key="value"
        type="button"
        :aria-label="label + ' ' + value"
        :aria-pressed="color.toLowerCase() === value"
        :style="{ backgroundColor: value }"
        class="size-8 shrink-0 rounded-md border border-accented outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
        :class="
          color.toLowerCase() === value
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
