import { chmodSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: "make-cli-executable",
      writeBundle() {
        chmodSync("dist/cli.js", 0o755);
      },
    },
    react(),
    dts({
      entryRoot: "src",
      exclude: ["test"],
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  build: {
    lib: {
      entry: { genomebrowser: "src/lib.ts", cli: "src/cli.ts" },
      name: "genomebrowser",
      fileName: (format, entryName) =>
        entryName === "cli" ? "cli.js" : `genomebrowser.${format}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        id.startsWith("node:") ||
        id === "jiti" ||
        id === "react" ||
        id === "react-dom" ||
        id === "react/jsx-runtime" ||
        id === "zod" ||
        id === "zustand",
      output: {
        sourcemapExcludeSources: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: true,
  },
});
