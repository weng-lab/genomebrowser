import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DialogForm } from "./DialogForm";

const meta = {
  title: "Components/DialogForm",
  component: DialogForm,
  decorators: [
    (Story) => (
      <Dialog open fullWidth maxWidth="xs">
        <Story />
      </Dialog>
    ),
  ],
  args: {
    title: "New session",
    submitLabel: "Create",
    onSubmit: fn(),
    onCancel: fn(),
    children: (
      <>
        <TextField
          label="Name"
          placeholder="New session"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField select label="Assembly" defaultValue="GRCh38">
          <MenuItem value="GRCh38">Human (GRCh38)</MenuItem>
          <MenuItem value="mm10">Mouse (mm10)</MenuItem>
        </TextField>
      </>
    ),
  },
} satisfies Meta<typeof DialogForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fields: Story = {};

/** While the form can't be submitted, such as before sessions load. */
export const SubmitDisabled: Story = { args: { submitDisabled: true } };
