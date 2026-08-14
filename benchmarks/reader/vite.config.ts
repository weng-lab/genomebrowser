import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      stream: "stream-browserify",
    },
  },
  server: {
    host: "127.0.0.1",
  },
  preview: {
    host: "127.0.0.1",
  },
  build: {
    sourcemap: true,
  },
});
