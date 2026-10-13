import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { setupFiles: ["@weng-lab/render-probe/setup", "./test/trackData.setup.ts"] },
});
