import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig(({ command, isPreview, mode }) => {
  const isDevelopmentServer = command === "serve" && !isPreview;
  const screenApiKey = isDevelopmentServer
    ? (process.env.SCREEN_API_KEY ?? loadEnv(mode, process.cwd(), "").SCREEN_API_KEY)
    : undefined;

  return {
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
      ...(isDevelopmentServer
        ? {
            proxy: {
              "/api/screen-graphql": {
                target: "https://screen.api.wenglab.org",
                changeOrigin: true,
                rewrite: () => "/graphql",
                ...(screenApiKey
                  ? { headers: { authorization: `Bearer ${screenApiKey}` } }
                  : undefined),
              },
            },
          }
        : undefined),
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
  };
});
