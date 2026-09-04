import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const { SCREEN_API_KEY } = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    },
    server: {
      proxy: {
        "/api/screen-graphql": {
          changeOrigin: true,
          headers: SCREEN_API_KEY ? { authorization: `Bearer ${SCREEN_API_KEY}` } : undefined,
          rewrite: () => "/graphql",
          target: "https://screen.api.wenglab.org",
        },
      },
    },
  };
});
