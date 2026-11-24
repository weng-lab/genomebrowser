import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusTag } from "./StatusTag";

const meta = {
  title: "Components/StatusTag",
  component: StatusTag,
  args: { label: "All changes saved", tone: "success" },
} satisfies Meta<typeof StatusTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {};

export const Saving: Story = { args: { label: "Saving…", tone: "neutral", busy: true } };

export const Retrying: Story = { args: { label: "Retrying…", tone: "warning", busy: true } };

export const Failed: Story = { args: { label: "Not saved", tone: "error" } };

export const Unsaved: Story = { args: { label: "Unsaved", tone: "neutral" } };

/** In a container narrower than 300px, only the dot shows; the label stays for screen readers. */
export const Compact: Story = {
  args: { compactWhen: "@container (max-width: 300px)" },
  decorators: [
    (Story) => (
      <Box sx={{ containerType: "inline-size", width: 240 }}>
        <Story />
      </Box>
    ),
  ],
};
