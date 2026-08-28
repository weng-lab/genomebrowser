import react from "@vitejs/plugin-react";
import { chmodSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  test: {
    server: {
      deps: { inline: ["@mui/x-data-grid", "@mui/x-data-grid-premium"] },
    },
  },
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
    }),
    {
      name: "make-trackselect-executable",
      writeBundle() {
        chmodSync(path.resolve(__dirname, "dist/trackselect.js"), 0o755);
      },
    },
  ],
  build: {
    lib: {
      entry: {
        "genomebrowser-ui": path.resolve(__dirname, "src/lib.ts"),
        trackselect: path.resolve(__dirname, "src/trackselect.ts"),
      },
      name: "genomebrowser-ui",
      fileName: (format, entryName) =>
        entryName === "genomebrowser-ui" ? `${entryName}.${format}.js` : `${entryName}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@weng-lab/genomebrowser",
        "jiti",
        "zod",
        /^node:.*/,
        /^@mui\/.*/,
        /^@emotion\/.*/,
      ],
      output: {
        sourcemapExcludeSources: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: true,
  },
});
