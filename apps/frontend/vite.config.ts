import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";
import { irisTheme } from "@qr-studio/theme/nuxt-ui";

export default defineConfig({
  plugins: [
    vue(),
    ui({
      ui: irisTheme,
      icon: { clientBundle: { icons: Object.values(irisTheme.icons) } },
      router: false,
      colorMode: false,
      autoImport: false,
      components: false,
      experimental: { componentDetection: true },
      dts: false,
      scanPackages: ["@qr-studio/toolkit"],
    }),
  ],
  resolve: { dedupe: ["vue", "@nuxt/ui"] },
});
