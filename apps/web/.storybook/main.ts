import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  // Design-system components keep their stories beside them. Stories that need the app's
  // navigation or `@weng-lab` packages, which lint keeps out of shared/ui, live in design/.
  stories: ["../shared/ui/**/*.stories.tsx", "../design/**/*.stories.tsx"],
  core: { disableTelemetry: true },
};

export default config;
