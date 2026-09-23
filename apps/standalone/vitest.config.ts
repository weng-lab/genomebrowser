import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)) },
  },
  test: { include: ["test/**/*.test.{ts,tsx}"], exclude: ["test/**/*.db.test.ts"] },
});
