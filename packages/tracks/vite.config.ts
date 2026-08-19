import react from "@vitejs/plugin-react";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageNodeModules = path.resolve(__dirname, "node_modules");

export default defineConfig({
  test: {
    alias: {
      "@emotion/react": path.join(packageNodeModules, "@emotion/react"),
      "@emotion/styled": path.join(packageNodeModules, "@emotion/styled"),
      "@mui/material": path.join(packageNodeModules, "@mui/material"),
      "@weng-lab/genomebrowser": path.resolve(__dirname, "../core/src/lib.ts"),
      "@weng-lab/genomebrowser-tracks/bigbed": path.resolve(__dirname, "src/bigbed/index.ts"),
      "@weng-lab/genomebrowser-tracks/bigwig": path.resolve(__dirname, "src/bigwig/index.ts"),
      "@weng-lab/genomebrowser-tracks/bulkbed": path.resolve(__dirname, "src/bulkbed/index.ts"),
      "@weng-lab/genomebrowser-tracks/cave": path.resolve(__dirname, "src/cave/index.ts"),
      "@weng-lab/genomebrowser-tracks/methylc": path.resolve(__dirname, "src/methylc/index.ts"),
      "@weng-lab/genomebrowser-tracks/settings": path.resolve(__dirname, "src/settings/index.ts"),
      "@weng-lab/genomebrowser-tracks/tooltips": path.resolve(__dirname, "src/tooltips/index.ts"),
      "@weng-lab/genomebrowser-tracks/transcript": path.resolve(
        __dirname,
        "src/transcript/index.ts",
      ),
      "@weng-lab/genomebrowser-tracks": path.resolve(__dirname, "src/lib.ts"),
      react: path.join(packageNodeModules, "react"),
      "react-dom": path.join(packageNodeModules, "react-dom"),
    },
    server: {
      deps: {
        inline: ["zustand"],
      },
    },
  },
  plugins: [
    react(),
    dts({
      entryRoot: "src",
      include: ["src"],
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  build: {
    lib: {
      entry: {
        "genomebrowser-tracks": path.resolve(__dirname, "src/lib.ts"),
        bigbed: path.resolve(__dirname, "src/bigbed/index.ts"),
        bigwig: path.resolve(__dirname, "src/bigwig/index.ts"),
        bulkbed: path.resolve(__dirname, "src/bulkbed/index.ts"),
        cave: path.resolve(__dirname, "src/cave/index.ts"),
        methylc: path.resolve(__dirname, "src/methylc/index.ts"),
        transcript: path.resolve(__dirname, "src/transcript/index.ts"),
        settings: path.resolve(__dirname, "src/settings/index.ts"),
        tooltips: path.resolve(__dirname, "src/tooltips/index.ts"),
      },
      name: "genomebrowser-tracks",
      fileName: (format, entryName) =>
        entryName === "genomebrowser-tracks" ? `${entryName}.${format}.js` : `${entryName}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        id === "react" ||
        id === "react-dom" ||
        id === "react/jsx-runtime" ||
        id === "zod" ||
        id === "@weng-lab/genomebrowser" ||
        id === "@weng-lab/genomic-reader" ||
        id.startsWith("@mui/") ||
        id.startsWith("@emotion/"),
      output: {
        sourcemapExcludeSources: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: true,
  },
});
