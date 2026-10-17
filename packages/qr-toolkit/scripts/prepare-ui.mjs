import { resolveConfig } from "vite";
import ui from "@nuxt/ui/vite";
import { irisTheme } from "@qr-studio/theme/nuxt-ui";

// Local authoring types for /ui. The consuming app still owns runtime theme generation.
// Keep Nuxt UI out of the framework-free playground's Vite configuration.
await resolveConfig(
  {
    configFile: false,
    plugins: [
      ui({
        ui: irisTheme,
        router: false,
        colorMode: false,
        autoImport: false,
        components: false,
        dts: false,
      }),
    ],
  },
  "build",
);
