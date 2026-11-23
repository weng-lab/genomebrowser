import Button from "@mui/material/Button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

const meta = {
  title: "Components/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    open: true,
    title: "Delete all regions?",
    text: "Every saved region, its highlight, and every group will be removed from this session.",
    confirmLabel: "Delete all",
    tone: "danger",
    onConfirm: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {};

/** More choices sit between cancel and confirm, as when an account change can't save first. */
export const MoreChoices: Story = {
  args: {
    title: "Changes not saved",
    text: "The open session’s latest changes could not be saved. Stay to keep them, or discard them and continue.",
    cancelLabel: "Stay",
    actions: <Button onClick={fn()}>Try again</Button>,
    confirmLabel: "Discard changes",
  },
};
