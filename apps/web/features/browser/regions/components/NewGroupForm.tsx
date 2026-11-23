"use client";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import { FormCard, FormCardActions } from "../../../../shared/ui/FormCard";
import { SwatchPicker } from "../../../../shared/ui/SwatchPicker";
import { swatchColors } from "../../../../shared/ui/color";
import type { RegionGroup } from "../regionGroupSchema";

export type NewGroup = Pick<RegionGroup, "name" | "color" | "regionIds"> & {
  /** Whether the group's regions take its color as their highlights' color. */
  applyColor: boolean;
};

/** A region the new group can start with: its ID, name, and positions as shown. */
export type GroupCandidate = { id: string; name: string; positions: string };

type NewGroupFormProps = {
  id: string;
  /** The name the group takes when the field is left blank, and the color it starts with. */
  defaults: Pick<RegionGroup, "name" | "color">;
  /** The regions it can start with, in list order. */
  candidates: readonly GroupCandidate[];
  /** The IDs of the candidates checked when it opens. */
  initialRegionIds: readonly string[];
  /** Creates the group, or returns why it could not, which the form shows, staying open. */
  onCreate: (group: NewGroup) => string | undefined;
  onCancel: () => void;
};

/**
 * The Regions section's form for a new group: an optional name, a color or none, the regions
 * it starts with, and whether they take its color.
 */
export function NewGroupForm({
  id,
  defaults,
  candidates,
  initialRegionIds,
  onCreate,
  onCancel,
}: NewGroupFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(defaults.color);
  const [checked, setChecked] = useState(() => new Set(initialRegionIds));
  const [applyColor, setApplyColor] = useState(false);
  const [error, setError] = useState<string>();
  const errorId = useId();
  // In list order, whatever order they were checked in.
  const regionIds = candidates.filter((region) => checked.has(region.id)).map(({ id }) => id);
  // Without a color, or regions to take it, there is nothing to apply.
  const canApply = regionIds.length > 0 && color !== null;
  const toggle = (regionId: string) => {
    const next = new Set(checked);
    if (!next.delete(regionId)) next.add(regionId);
    setChecked(next);
  };

  return (
    <FormCard
      id={id}
      label="New group"
      onSubmit={() =>
        setError(
          onCreate({
            name: name.trim() || defaults.name,
            color,
            regionIds,
            applyColor: canApply && applyColor,
          }),
        )
      }
      describedBy={error ? errorId : undefined}
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
        colors={swatchColors}
        value={color}
        onChange={setColor}
        allowNone
        allowCustom
      />
      {candidates.length > 0 ? (
        <Box component="fieldset" sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}>
          <Typography component="legend" variant="body2" sx={{ p: 0, mb: 1 }}>
            Add regions
          </Typography>
          {/* A long list scrolls, so the form stays short. */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              maxHeight: 180,
              overflowY: "auto",
              py: 0.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            {candidates.map((region) => (
              <FormControlLabel
                key={region.id}
                control={
                  <Checkbox
                    size="small"
                    checked={checked.has(region.id)}
                    onChange={() => toggle(region.id)}
                  />
                }
                label={
                  <>
                    <Typography variant="body2" noWrap>
                      {region.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ display: "block", fontFamily: "monospace" }}
                    >
                      {region.positions}
                    </Typography>
                  </>
                }
                slotProps={{ typography: { component: "div", sx: { minWidth: 0 } } }}
                sx={{ mx: 0, px: 0.5, gap: 0.5, alignItems: "center", minWidth: 0 }}
              />
            ))}
          </Box>
        </Box>
      ) : null}
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
      {error ? (
        <Typography id={errorId} role="alert" variant="body2" color="error">
          {error}
        </Typography>
      ) : null}
      <FormCardActions submitLabel="Create group" onCancel={onCancel} align="end" />
    </FormCard>
  );
}
