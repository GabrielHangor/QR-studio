<script setup lang="ts">
import UAlert from "@nuxt/ui/components/Alert.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import USlider from "@nuxt/ui/components/Slider.vue";
import USwitch from "@nuxt/ui/components/Switch.vue";

import type { RenderQrSvgOptions } from "../../engine/types.js";
import type { QrEditorMessages } from "../messages.js";
import QrFieldHelp from "./QrFieldHelp.vue";
const props = defineProps<{
  design: RenderQrSvgOptions;
  messages: QrEditorMessages;
  busy: boolean;
  issue?: "logoFormat" | "logoTooLarge" | "logoInvalid";
}>();
const emit = defineEmits<{
  "update:design": [value: RenderQrSvgOptions];
  "upload": [value: File];
  "remove": [];
}>();
function patchLogo(value: Partial<NonNullable<RenderQrSvgOptions["logo"]>>) {
  if (props.design.logo) {
    emit("update:design", { ...props.design, logo: { ...props.design.logo, ...value } });
  }
}
function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit("upload", file);
  input.value = "";
}
</script>
<template>
  <div class="space-y-4 pb-4">
    <p v-if="!design.logo && !busy && !issue" class="text-sm text-muted">{{ messages.noLogo }}</p>
    <UFormField :label="messages.logoFile" :help="messages.logoHelp">
      <UInput
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="w-full"
        @change="upload"
      />
    </UFormField>
    <UAlert v-if="issue" color="error" :description="messages[issue]" role="alert" />
    <USwitch
      v-if="design.logo"
      :model-value="design.logo.clearBackground ?? true"
      :label="messages.clearLogo"
      @update:model-value="patchLogo({ clearBackground: $event })"
    />
    <template v-if="design.logo">
      <UFormField :label="messages.logoSize">
        <USlider
          :model-value="design.logo.widthModules"
          :min="1"
          :max="20"
          :step="0.5"
          :aria-label="messages.logoSize"
          class="my-3"
          @update:model-value="patchLogo({ widthModules: $event })"
        />
        <div class="flex justify-between text-xs text-muted">
          <span>{{ messages.smaller }}</span>
          <span>{{ messages.larger }}</span>
        </div>
      </UFormField>
      <details>
        <summary class="cursor-pointer py-2 text-sm font-medium text-highlighted">
          {{ messages.advanced }}
        </summary>
        <div class="mt-3 grid grid-cols-2 gap-4">
          <UFormField :label="messages.logoWidth">
            <template #hint>
              <QrFieldHelp
                :label="messages.logoWidth"
                :text="messages.logoSizeHint"
                :action-label="messages.help"
              />
            </template>
            <UInput
              type="number"
              :min="1"
              :max="20"
              :step="0.5"
              :model-value="design.logo.widthModules"
              class="w-full"
              @update:model-value="patchLogo({ widthModules: Number($event) })"
            />
          </UFormField>
          <UFormField v-if="design.logo.clearBackground !== false" :label="messages.logoPadding">
            <UInput
              type="number"
              :min="0"
              :max="8"
              :step="0.5"
              :model-value="design.logo.paddingModules ?? 0.5"
              class="w-full"
              @update:model-value="patchLogo({ paddingModules: Number($event) })"
            />
          </UFormField>
        </div>
      </details>
    </template>
    <UButton
      v-if="design.logo || busy || issue"
      color="neutral"
      :label="messages.removeLogo"
      @click="emit('remove')"
    />
  </div>
</template>
