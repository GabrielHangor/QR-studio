import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";
import { irisTheme } from "@qr-studio/theme/nuxt-ui";

export default defineConfig({
  plugins: [
    vue(),
    ui({
      ui: irisTheme,
      router: false,
      colorMode: false,
      autoImport: false,
      components: false,
      dts: false,
      scanPackages: ["@qr-studio/toolkit"],
    }),
  ],
  resolve: { dedupe: ["vue", "@nuxt/ui"] },
});
