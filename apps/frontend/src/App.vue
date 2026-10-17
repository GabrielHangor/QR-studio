<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import { ru } from "@nuxt/ui/locale";
import { QrEditor } from "@qr-studio/toolkit/ui";
</script>

<template>
  <UApp :locale="ru">
    <main class="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 p-4 sm:p-8">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold text-highlighted">QR Studio</h1>
        <UBadge color="secondary">Iris</UBadge>
      </header>
      <QrEditor />
    </main>
  </UApp>
</template>
