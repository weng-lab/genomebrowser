import react from "@vitejs/plugin-react";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  server: {
    allowedHosts: true,
  },
  build: {
    lib: {
      entry: {
        "genomebrowser-ui-v2": path.resolve(__dirname, "src/lib.ts"),
        cli: path.resolve(__dirname, "src/cli.ts"),
        trackselect: path.resolve(__dirname, "src/trackselect.ts"),
      },
      name: "genomebrowser-ui-v2",
      fileName: (format, entryName) =>
        entryName === "genomebrowser-ui-v2" ? `${entryName}.${format}.js` : `${entryName}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@weng-lab/genomebrowser-v2",
        "jiti",
        "zod",
        /^node:.*/,
        /^@mui\/.*/,
        /^@emotion\/.*/,
      ],
    },
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: true,
  },
});
