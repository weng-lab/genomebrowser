import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { FormCard, FormCardActions } from "./FormCard";
import { SwatchPicker } from "./SwatchPicker";
import { swatchColors } from "./color";

/** The fields of the regions panel's New group form, without its region list. */
function NewGroup({ onSubmit, onCancel }: { onSubmit: () => void; onCancel: () => void }) {
  const [color, setColor] = useState<string | null>(swatchColors[1].color);
  return (
    <FormCard label="New group" onSubmit={onSubmit} onCancel={onCancel}>
      <TextField
        placeholder="Group 1 (optional)"
        size="small"
        fullWidth
        slotProps={{ htmlInput: { "aria-label": "Group name" } }}
      />
      <SwatchPicker
        label="Group color"
        colors={swatchColors}
        value={color}
        onChange={setColor}
        allowNone
        allowCustom
      />
      <FormCardActions submitLabel="Create group" onCancel={onCancel} align="end" />
    </FormCard>
  );
}

const meta = {
  title: "Components/FormCard",
  component: NewGroup,
  decorators: [
    (Story) => (
      <Box sx={{ width: 300 }}>
        <Story />
      </Box>
    ),
  ],
  args: { onSubmit: fn(), onCancel: fn() },
} satisfies Meta<typeof NewGroup>;

export default meta;

export const InAPanel: StoryObj<typeof meta> = {};
