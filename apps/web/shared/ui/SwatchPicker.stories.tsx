import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SwatchPicker, type SwatchPickerProps } from "./SwatchPicker";
import { swatchColors } from "./color";

/** Holds the chosen color, so the row can be clicked through. */
function Picker(props: Omit<SwatchPickerProps, "value" | "onChange"> & { initial: string | null }) {
  const { initial, ...rest } = props;
  const [color, setColor] = useState(initial);
  return (
    <Box sx={{ width: 250 }}>
      <SwatchPicker {...rest} value={color} onChange={setColor} />
    </Box>
  );
}

const meta = {
  title: "Components/SwatchPicker",
  component: Picker,
  args: { label: "Group color", colors: swatchColors, initial: swatchColors[1].color },
} satisfies Meta<typeof Picker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {};

/** A group's color row: no color, and any other color through the +. */
export const NoneAndCustom: Story = { args: { allowNone: true, allowCustom: true } };

/** A region's color row, where the dotted option hides it. */
export const Hidden: Story = {
  args: {
    label: "Region color",
    allowNone: true,
    noneLabel: "Hidden",
    allowCustom: true,
    initial: null,
  },
};

/** A custom color fills the +. */
export const CustomChosen: Story = { args: { allowCustom: true, initial: "#e91e63" } };
