import Download from "@mui/icons-material/Download";
import Sort from "@mui/icons-material/Sort";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";
import { ControlToolbar } from "@weng-lab/genomebrowser-ui";

// A browser store for the toolbar, as in the UI package's ControlToolbar docs.
const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_365_153, end: 53_405_654 },
  trackWidth: 900,
});

/**
 * The browser toolbar from `@weng-lab/genomebrowser-ui`, styled by the app theme's
 * `GbControlToolbar` and `GbLabeledGroup` entries.
 */
const meta = {
  title: "App/ControlToolbar",
  component: ControlToolbar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Box sx={{ bgcolor: "background.subtle", p: 2 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    browserStore: useBrowserStore,
    // Search needs the app's server; the rest of the toolbar works on its own.
    search: { assembly: "GRCh38", graphqlUrl: "/api/screen-graphql", queries: ["Coordinate"] },
    managementActions: (
      <>
        <Button size="small" startIcon={<Sort />}>
          Sort tracks
        </Button>
        <Button size="small" startIcon={<Download />}>
          Download
        </Button>
      </>
    ),
  },
} satisfies Meta<typeof ControlToolbar>;

export default meta;

export const InTheBrowser: StoryObj<typeof meta> = {};
