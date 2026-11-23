import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./EmptyState";

/** For a line of status, such as while content loads, use `StatusMessage` instead. */
const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  decorators: [
    (Story) => (
      <Box sx={{ width: 320 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    title: "No regions yet",
    description: "Add the current view, or enter coordinates, to save a region.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDescription: Story = {};

export const TitleOnly: Story = { args: { description: undefined } };
