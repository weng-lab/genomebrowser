import { defineConfig } from "vitest/config";

const withoutSetup = "test/withoutSetup.test.tsx";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "probe",
          environment: "jsdom",
          setupFiles: ["./src/setup.ts"],
          exclude: ["**/node_modules/**", withoutSetup],
        },
      },
      {
        test: {
          name: "without-setup",
          environment: "jsdom",
          include: [withoutSetup],
        },
      },
    ],
  },
});
