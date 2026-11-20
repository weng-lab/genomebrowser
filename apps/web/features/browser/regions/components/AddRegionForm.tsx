"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import { useState } from "react";

type AddRegionFormProps = {
  id: string;
  /** The name the region takes when the field is left blank. */
  defaultName: string;
  /** Saves the current view as a region named `name`, which may be blank. */
  onAdd: (name: string) => void;
  onCancel: () => void;
};

/**
 * The Regions section's form for a new region: its name, then saving the current view.
 * Escape cancels. Adding by coordinates comes with its own design.
 */
export function AddRegionForm({ id, defaultName, onAdd, onCancel }: AddRegionFormProps) {
  const [name, setName] = useState("");
  return (
    <Paper
      id={id}
      component="form"
      variant="outlined"
      aria-label="Add region"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(name);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        bgcolor: "background.default",
      }}
    >
      <TextField
        label="Region name"
        placeholder={defaultName}
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="small"
        fullWidth
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The form opens, from the user's click, to name the region.
        autoFocus
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Button variant="outlined" size="small" sx={buttonSx}>
        Add by coordinates
      </Button>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button type="submit" variant="contained" size="small" disableElevation sx={buttonSx}>
          Add current region
        </Button>
        <Button size="small" onClick={onCancel} sx={{ ...buttonSx, color: "text.primary" }}>
          Cancel
        </Button>
      </Box>
    </Paper>
  );
}

const buttonSx = {
  px: 1.5,
  borderRadius: 2,
  textTransform: "none",
  typography: "body2",
  whiteSpace: "nowrap",
} as const;
