import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      // libsodium-wrappers ships a broken ESM build (imports a missing
      // ./libsodium.mjs) and its exports map blocks subpath fixes. Pin it to
      // a local stub so the desktop always builds; the GitHub secret-sync
      // feature degrades gracefully. See src/lib/sodium-stub.ts.
      "libsodium-wrappers": path.resolve(__dirname, "src/lib/sodium-stub.ts"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2021",
    outDir: "dist",
    emptyOutDir: true,
  },
});