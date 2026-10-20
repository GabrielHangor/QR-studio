<script setup lang="ts" generic="T extends string">
import URadioGroup from "@nuxt/ui/components/RadioGroup.vue";
import { computed } from "vue";

const props = defineProps<{
  label: string;
  modelValue?: T;
  items: readonly { value: T; label: string; source?: string }[];
  large?: boolean;
  hideLabels?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: T] }>();
const items = computed<{ value: string; label: string; source?: string }[]>(() => [...props.items]);
function choose(value: string) {
  const item = props.items.find((option) => option.value === value);
  if (item) emit("update:modelValue", item.value);
}
</script>

<template>
  <URadioGroup
    :aria-label="label"
    :model-value="modelValue"
    :items="items"
    variant="card"
    indicator="hidden"
    orientation="horizontal"
    :ui="{
      fieldset: large
        ? 'grid grid-cols-3 gap-2 sm:grid-cols-4 @min-[42rem]:grid-cols-6'
        : items.length === 2
          ? 'grid grid-cols-[repeat(2,minmax(0,5rem))] gap-2'
          : 'grid grid-cols-3 gap-1.5 @min-[38rem]:grid-cols-6',
      item: 'min-w-0 cursor-pointer rounded-lg p-1.5 transition-colors',
      container: 'sr-only',
      indicator: 'hidden',
      wrapper: 'min-w-0 w-full',
      label: large
        ? 'flex flex-col items-center gap-2 text-center text-xs font-medium'
        : 'flex flex-col items-center gap-1 text-center text-xs font-medium',
    }"
    @update:model-value="choose"
  >
    <template #label="{ item }">
      <span
        class="flex shrink-0 items-center justify-center"
        :class="large ? 'size-20' : 'size-10'"
      >
        <img v-if="item.source" :src="item.source" alt="" class="block size-full object-contain" />
        <span v-else class="flex aspect-square w-16 items-center justify-center text-dimmed">
          —
        </span>
      </span>
      <span :class="hideLabels ? 'sr-only' : undefined">{{ item.label }}</span>
    </template>
  </URadioGroup>
</template>
