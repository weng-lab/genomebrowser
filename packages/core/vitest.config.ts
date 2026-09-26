import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
    setupFiles: ["@weng-lab/render-probe/setup"],
  },
});
