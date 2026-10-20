import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Read DATABASE_URL from the same .env files as Next.js.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./features/sessions/server/table.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
