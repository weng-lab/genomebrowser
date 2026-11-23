import Button from "@mui/material/Button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { StatusMessage } from "./StatusMessage";

/** For a list or section with nothing to show yet, use `EmptyState` instead. */
const meta = {
  title: "Components/StatusMessage",
  component: StatusMessage,
  args: { message: "Open a session to save regions." },
} satisfies Meta<typeof StatusMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {};

export const Loading: Story = { args: { message: "Loading saved sessions…" } };

export const Failed: Story = {
  args: { message: "Could not reach saved sessions. Retrying…", tone: "error" },
};

export const WithAction: Story = {
  args: {
    message: "Open a recent session or create one from the menu beside the title.",
    action: (
      <Button size="small" onClick={fn()}>
        Try again
      </Button>
    ),
  },
};
