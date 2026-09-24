import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

const envFile = fileURLToPath(new URL("./.env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["test/**/*.db.test.ts"],
    hookTimeout: 30000,
    env: databaseUrl ? { TEST_DATABASE_URL: databaseUrl } : {},
  },
});
