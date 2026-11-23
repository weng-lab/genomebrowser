import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { Preview } from "@storybook/react-vite";
import { theme } from "../shared/ui/theme";

/** Every story renders with the app theme and baseline, as inside the workspace. */
const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    controls: { expanded: true },
  },
};

export default preview;
