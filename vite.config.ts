import { defineConfig } from "vite";
// @ts-expect-error plain mjs plugin copied from Gravewake
import { swPlugin } from "./scripts/sw-plugin.mjs";
export default defineConfig({ base: "/ki-quest/", plugins: [swPlugin()], build: { outDir: "dist", assetsInlineLimit: 0 } });
