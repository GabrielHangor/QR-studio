import ui from "@nuxt/ui/vite";
import { irisTheme } from "@qr-studio/theme/nuxt-ui";
import { resolveConfig } from "vite";

// Local authoring types for /ui. The consuming app still owns runtime theme generation.
// Generate types independently of the consuming app's Vite configuration.
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
