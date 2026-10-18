<script setup lang="ts">
import { ref } from "vue";
import UTooltip from "@nuxt/ui/components/Tooltip.vue";
import UButton from "@nuxt/ui/components/Button.vue";

defineProps<{ label: string; text: string; actionLabel: string }>();
const open = ref(false);
</script>

<template>
  <UTooltip
    v-model:open="open"
    :text="text"
    :delay-duration="150"
    :disable-closing-trigger="true"
    :ui="{ content: 'h-auto max-w-72 py-2', text: 'whitespace-normal text-sm leading-relaxed' }"
  >
    <UButton
      label="?"
      :aria-label="actionLabel + ': ' + label"
      :aria-expanded="open"
      color="neutral"
      variant="ghost"
      size="xs"
      class="size-7 justify-center rounded-full ring ring-default"
      @click="open = !open"
    />
  </UTooltip>
</template>
