<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import { ru } from "@nuxt/ui/locale";
import { QrEditor, fullEditorConfig, compactEditorConfig } from "@qr-studio/toolkit/ui";
import { computed, ref } from "vue";

import { editorPresets } from "./presets.js";

const configMode = ref<"full" | "compact">("full");
const editorConfig = computed(() =>
  configMode.value === "full" ? fullEditorConfig : compactEditorConfig,
);
const configOptions = [
  { value: "full", label: "Полный" },
  { value: "compact", label: "Компактный" },
] as const;
</script>

<template>
  <UApp :locale="ru">
    <main class="mx-auto flex min-h-dvh w-full max-w-[112rem] flex-col gap-4 p-4 sm:p-6 xl:p-8">
      <header class="flex flex-wrap items-center gap-3">
        <span id="editor-config-label" class="text-sm text-muted">Конфигурация редактора</span>
        <div role="group" aria-labelledby="editor-config-label" class="flex gap-1">
          <UButton
            v-for="option in configOptions"
            :key="option.value"
            :variant="configMode === option.value ? 'solid' : 'ghost'"
            :aria-pressed="configMode === option.value"
            @click="configMode = option.value"
          >
            {{ option.label }}
          </UButton>
        </div>
      </header>
      <QrEditor :config="editorConfig" :presets="editorPresets" />
    </main>
  </UApp>
</template>
