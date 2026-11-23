import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ColorPicker } from "./ColorPicker";
import { swatchColors } from "./color";

/** A color row's + opens it in a popover. */
const meta = {
  title: "Components/ColorPicker",
  component: ColorPicker,
  decorators: [
    (Story) => (
      <Box
        sx={{ display: "inline-block", bgcolor: "background.paper", borderRadius: 3, boxShadow: 4 }}
      >
        <Story />
      </Box>
    ),
  ],
  args: {
    initialColor: swatchColors[1].color,
    label: "Custom color",
    onApply: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;

export const Picker: StoryObj<typeof meta> = {};
