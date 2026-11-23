import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorDot } from "./ColorDot";
import { swatchColors } from "./color";

const meta = {
  title: "Components/ColorDot",
  component: ColorDot,
  args: { color: swatchColors[1].color, size: 12 },
} satisfies Meta<typeof ColorDot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A region or group's color, as in their rows. */
export const Filled: Story = {};

/** An outlined highlight. */
export const Outlined: Story = { args: { outlined: true } };

/** A hidden highlight. */
export const Faded: Story = { args: { faded: true } };

/** A group with no color. */
export const NoColor: Story = { args: { color: null } };
