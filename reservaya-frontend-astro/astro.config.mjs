// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import astroIcon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://reservaya.com",
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [astroIcon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
