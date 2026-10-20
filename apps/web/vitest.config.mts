import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Next.js accepts `server-only` in server code; tests import those modules directly.
    alias: {
      "server-only": fileURLToPath(new URL("node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["@weng-lab/render-probe/setup", "./test/trackData.setup.ts"],
    // Transform Clerk so the `server-only` alias and the `next/headers` mock reach it.
    server: { deps: { inline: ["@clerk/nextjs"] } },
  },
});
