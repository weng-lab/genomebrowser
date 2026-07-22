import react from "@vitejs/plugin-react";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, isPreview, mode }) => {
  const isDevelopmentServer = command === "serve" && !isPreview;
  const screenApiKey = isDevelopmentServer
    ? (process.env.SCREEN_API_KEY ?? loadEnv(mode, process.cwd(), "").SCREEN_API_KEY)
    : undefined;

  return {
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
    ],
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
  };
});
