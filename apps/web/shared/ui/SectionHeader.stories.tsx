import Add from "@mui/icons-material/Add";
import CreateNewFolder from "@mui/icons-material/CreateNewFolder";
import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SectionHeader } from "./SectionHeader";

const meta = {
  title: "Components/SectionHeader",
  component: SectionHeader,
  decorators: [
    (Story) => (
      <Box sx={{ width: 320 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    title: "Regions",
    count: 4,
    actions: [
      { label: "Add region", icon: <Add />, onClick: fn() },
      { label: "Add group", icon: <CreateNewFolder />, onClick: fn() },
    ],
  },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The regions panel's header. */
export const WithActions: Story = {};

/** While an action's form is open, its button is tinted. */
export const FormOpen: Story = {
  args: {
    actions: [
      { label: "Add region", icon: <Add />, onClick: fn(), expanded: true, controls: "form" },
      { label: "Add group", icon: <CreateNewFolder />, onClick: fn() },
    ],
  },
};

export const TitleOnly: Story = { args: { count: undefined, actions: undefined } };
