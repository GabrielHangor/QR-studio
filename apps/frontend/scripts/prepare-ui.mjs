import { resolveConfig } from "vite";

// Run Vite's config hooks to generate Nuxt UI theme types, without starting a server.
await resolveConfig({}, "build");
