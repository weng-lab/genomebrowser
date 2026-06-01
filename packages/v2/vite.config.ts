import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ["VITE_", "SCREEN_"],
  plugins: [
    react(),
    dts({
      entryRoot: "src",
      exclude: ["src/App.tsx", "src/main.tsx", "test"],
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  server: {
    allowedHosts: true,
  },
  build: {
    lib: {
      entry: "src/lib.ts",
      name: "genomebrowser-v2",
      fileName: (format) => `genomebrowser-v2.${format}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        id === "react" ||
        id === "react-dom" ||
        id === "react/jsx-runtime" ||
        id === "zod" ||
        id === "zustand" ||
        id === "genomic-reader" ||
        id === "buffer" ||
        id === "axios" ||
        id.startsWith("axios/"),
    },
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: true,
  },
});
