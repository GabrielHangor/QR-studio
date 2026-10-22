<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
import { ru } from "@nuxt/ui/locale";
import {
  QrEditor,
  createQrEditorState,
  fullEditorConfig,
  compactEditorConfig,
  type QrEditorConfig,
} from "@qr-studio/toolkit/ui";
import { computed, ref } from "vue";

import { editorLogoPresets } from "../../src/logo-presets.js";

const state = ref(createQrEditorState());
const mode = ref("full");
const customConfig = {
  ...fullEditorConfig,
  contentTypes: ["text"],
  initialSection: "shapes",
  sections: [
    { id: "shapes", controls: ["moduleShape"] },
    { id: "technical", controls: ["quietZone"] },
    { id: "colors", controls: ["foreground"] },
  ],
  choices: { ...fullEditorConfig.choices, moduleShape: ["leaf"] },
  ranges: { ...fullEditorConfig.ranges, quietZone: { min: 8, max: 10, step: 2 } },
  palettes: { foreground: ["#112233"], background: ["#ffffff"] },
  export: { formats: ["png"], resolutions: [768, 1536], resolution: true, scan: false },
  recommendations: false,
} as const satisfies QrEditorConfig;
const noMapConfig = {
  ...fullEditorConfig,
  contentTypes: ["location"],
  sections: [{ id: "content", controls: [] }],
} as const satisfies QrEditorConfig;
const logoConfig = {
  ...fullEditorConfig,
  contentTypes: ["url"],
  initialSection: "logo",
  sections: [{ id: "logo", controls: ["presets", "remove", "size"] }],
} as const satisfies QrEditorConfig;
const logoPresets = computed(() => {
  if (mode.value === "withoutCatalog") return [];
  if (mode.value === "badLogo") {
    return [
      {
        id: "invalid",
        title: "Некорректный логотип",
        dataUri: "https://unavailable.invalid/logo.svg",
      },
      { id: "broken", title: "Повреждённый логотип", dataUri: "data:image/png;base64,AAAA" },
    ];
  }
  return editorLogoPresets.slice(0, 2);
});
const configurations: Record<string, QrEditorConfig> = {
  full: fullEditorConfig,
  compact: compactEditorConfig,
  custom: customConfig,
  noMap: noMapConfig,
  logoOnly: logoConfig,
  withoutCatalog: logoConfig,
  badLogo: logoConfig,
};
const config = computed(() => configurations[mode.value]!);
</script>

<template>
  <UApp :locale="ru">
    <main class="mx-auto max-w-7xl space-y-4 p-4">
      <nav aria-label="Test configurations" class="flex flex-wrap gap-4">
        <button
          v-for="name in [
            'full',
            'compact',
            'custom',
            'noMap',
            'logoOnly',
            'withoutCatalog',
            'badLogo',
          ]"
          :key="name"
          type="button"
          @click="mode = name"
        >
          {{ name }}
        </button>
      </nav>
      <QrEditor v-model="state" :config="config" :logo-presets="logoPresets" />
      <output aria-label="Test editor state" class="block break-all text-xs">
        {{ JSON.stringify(state) }}
      </output>
    </main>
  </UApp>
</template>
