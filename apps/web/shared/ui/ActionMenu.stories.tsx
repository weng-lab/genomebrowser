import ContentCopy from "@mui/icons-material/ContentCopy";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ActionMenu, MenuAction } from "./ActionMenu";

const meta = {
  title: "Components/ActionMenu",
  component: ActionMenu,
  args: {
    label: "Actions for session Alpha",
    children: (
      <>
        <MenuAction icon={<ContentCopy fontSize="small" />} label="Save a copy" onClick={fn()} />
        <MenuAction
          icon={<DeleteOutline fontSize="small" />}
          label="Delete"
          tone="danger"
          onClick={fn()}
        />
      </>
    ),
  },
} satisfies Meta<typeof ActionMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the button to open the menu. */
export const Actions: Story = {};

/** While another operation runs, such as saving a session. */
export const Disabled: Story = { args: { disabled: true } };
