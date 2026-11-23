"use client";

import Add from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { BrowserStoreInstance, GenomicRegion } from "@weng-lab/genomebrowser";
import { useId, useRef, useState } from "react";
import {
  FormCard,
  FormCardActions,
  formButtonSx,
  formCardSx,
} from "../../../../shared/ui/FormCard";
import { positionsOf, regionFromPositions, type Positions } from "../regions";

type AddRegionFormProps = {
  id: string;
  browserStore: BrowserStoreInstance;
  /** The name the region takes when the field is left blank. */
  defaultName: string;
  /** Saves `region` as a region named `name`, which may be blank. */
  onAdd: (name: string, region: GenomicRegion) => void;
  onCancel: () => void;
};

/**
 * The Regions section's form for a new region: its name, then saving the current view, or
 * coordinates on the shown chromosome, which start as the view's.
 */
export function AddRegionForm({
  id,
  browserStore,
  defaultName,
  onAdd,
  onCancel,
}: AddRegionFormProps) {
  const [name, setName] = useState("");
  // The typed coordinates while they are open, which the form then submits instead of the view.
  const [positions, setPositions] = useState<Positions | null>(null);
  const [error, setError] = useState<{ field: keyof Positions; text: string } | null>(null);
  const refocus = useRef(false);

  const submit = () => {
    const { region, assembly } = browserStore.getState();
    if (!positions) return onAdd(name, region);
    const result = regionFromPositions(region.chromosome, positions, assembly);
    if (result.ok) onAdd(name, result.region);
    else setError({ field: result.field, text: result.error });
  };
  const closeCoordinates = () => {
    refocus.current = true;
    setPositions(null);
    setError(null);
  };

  return (
    <FormCard id={id} label="Add region" onSubmit={submit} onCancel={onCancel}>
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
      {positions ? (
        <CoordinateFields
          positions={positions}
          error={error}
          onChange={(field, value) => {
            setPositions({ ...positions, [field]: value });
            if (error?.field === field) setError(null);
          }}
          onCancel={closeCoordinates}
        />
      ) : (
        <>
          <Button
            ref={(button) => {
              // Back from the coordinates, focus returns to what opened them.
              if (button && refocus.current) {
                refocus.current = false;
                button.focus();
              }
            }}
            size="small"
            startIcon={<Add />}
            onClick={() => setPositions(positionsOf(browserStore.getState().region))}
            sx={{ ...formButtonSx, alignSelf: "flex-start" }}
          >
            Add by coordinates
          </Button>
          <FormCardActions submitLabel="Add current region" onCancel={onCancel} />
        </>
      )}
    </FormCard>
  );
}

type CoordinateFieldsProps = {
  positions: Positions;
  error: { field: keyof Positions; text: string } | null;
  onChange: (field: keyof Positions, value: string) => void;
  /** Called by Escape, and by Cancel, which close the coordinates but not the form. */
  onCancel: () => void;
};

/** Start and end positions on the shown chromosome, which Apply submits with the form. */
function CoordinateFields({ positions, error, onChange, onCancel }: CoordinateFieldsProps) {
  const errorId = useId();
  const field = (key: keyof Positions, label: string) => {
    const invalid = error?.field === key;
    return (
      <TextField
        label={label}
        value={positions[key]}
        onChange={(event) => onChange(key, event.target.value)}
        size="small"
        error={invalid}
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The user's click opened the coordinates to edit them.
        autoFocus={key === "start"}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: {
            inputMode: "numeric",
            autoComplete: "off",
            "aria-describedby": invalid ? errorId : undefined,
          },
          input: { sx: { fontFamily: "monospace" } },
        }}
        sx={{ flex: 1, minWidth: 0 }}
      />
    );
  };
  return (
    <Paper
      variant="outlined"
      role="group"
      aria-label="Coordinates"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Escape here leaves the coordinates, not the whole form.
        event.stopPropagation();
        onCancel();
      }}
      sx={formCardSx}
    >
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {field("start", "Start")}
        {field("end", "End")}
      </Box>
      {error ? (
        <Typography id={errorId} variant="body2" color="error">
          {error.text}
        </Typography>
      ) : null}
      <FormCardActions submitLabel="Apply" onCancel={onCancel} />
    </Paper>
  );
}
