<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import { ru } from "@nuxt/ui/locale";
import { QrEditor } from "@qr-studio/toolkit/ui";

import { editorPresets } from "./presets.js";
</script>

<template>
  <UApp :locale="ru">
    <main class="mx-auto flex min-h-dvh w-full max-w-[112rem] flex-col gap-4 p-4 sm:p-6 xl:p-8">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold text-highlighted">QR Studio</h1>
        <UBadge color="secondary">Iris</UBadge>
      </header>
      <QrEditor :presets="editorPresets" />
    </main>
  </UApp>
</template>
