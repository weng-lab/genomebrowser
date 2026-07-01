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
      entry: path.resolve(__dirname, "src/lib.ts"),
      name: "genomebrowser-ui-v2",
      fileName: (format) => `genomebrowser-ui-v2.${format}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@weng-lab/genomebrowser-v2",
        "zod",
        /^@mui\/.*/,
        /^@emotion\/.*/,
      ],
    },
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: true,
  },
});
