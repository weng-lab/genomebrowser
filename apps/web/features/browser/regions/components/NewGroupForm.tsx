"use client";

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { FormCard, FormCardActions } from "../../../../shared/ui/FormCard";
import { SwatchPicker } from "../../../../shared/ui/SwatchPicker";
import type { RegionGroup } from "../regionGroupSchema";
import { groupColors } from "../regionGroups";

export type NewGroup = Pick<RegionGroup, "name" | "color"> & {
  /** Whether the group's regions take its color as their highlights' color. */
  applyColor: boolean;
};

type NewGroupFormProps = {
  id: string;
  /** The name the group takes when the field is left blank, and the color it starts with. */
  defaults: Pick<RegionGroup, "name" | "color">;
  /** Whether the group starts with regions, whose highlights its color can then recolor. */
  hasRegions: boolean;
  onCreate: (group: NewGroup) => void;
  onCancel: () => void;
};

/** The Regions section's form for a new group: an optional name, a color or none, and whether its regions take that color. */
export function NewGroupForm({ id, defaults, hasRegions, onCreate, onCancel }: NewGroupFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(defaults.color);
  const [applyColor, setApplyColor] = useState(false);
  // Without a color, or regions to take it, there is nothing to apply.
  const canApply = hasRegions && color !== null;

  return (
    <FormCard
      id={id}
      label="New group"
      onSubmit={() =>
        onCreate({ name: name.trim() || defaults.name, color, applyColor: canApply && applyColor })
      }
      onCancel={onCancel}
    >
      <TextField
        placeholder={`${defaults.name} (optional)`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="small"
        fullWidth
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The form opens, from the user's click, to name the group.
        autoFocus
        slotProps={{ htmlInput: { "aria-label": "Group name" } }}
      />
      <SwatchPicker
        label="Group color"
        colors={groupColors}
        value={color}
        onChange={setColor}
        allowNone
        allowCustom
      />
      <FormControlLabel
        label="Apply color to all regions"
        disabled={!canApply}
        control={
          <Checkbox
            checked={canApply && applyColor}
            onChange={(event) => setApplyColor(event.target.checked)}
          />
        }
        sx={{ ml: 0, gap: 0.5 }}
      />
      <FormCardActions submitLabel="Create group" onCancel={onCancel} align="end" />
    </FormCard>
  );
}
