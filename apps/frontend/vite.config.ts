import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// Bundle the workspace config so Vite watches it instead of caching it as an external package.
import { studioTheme } from "../../packages/theme/nuxt-ui.js";

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    ui({
      ui: studioTheme,
      icon: { clientBundle: { icons: Object.values(studioTheme.icons) } },
      router: false,
      colorMode: false,
      autoImport: false,
      components: false,
      // Detection runs only at startup; HMR can introduce components after that scan.
      experimental: { componentDetection: command === "build" },
      dts: false,
      scanPackages: ["@qr-studio/toolkit"],
    }),
  ],
  resolve: { dedupe: ["vue", "@nuxt/ui"] },
}));
