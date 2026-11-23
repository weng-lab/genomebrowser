"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { AssemblyDefinition, GenomicRegion } from "@weng-lab/genomebrowser";
import { useId, useState } from "react";
import { FormCardActions, formCardSx } from "../../../../shared/ui/FormCard";
import { positionsOf, regionFromPositions, type Positions } from "../regions";

type FieldError = { field: keyof Positions; text: string };

/**
 * Start and end positions being typed for a region on one chromosome, while they are open,
 * and the field at fault when they are not a region.
 */
export function useCoordinates() {
  const [draft, setDraft] = useState<{ chromosome: string; positions: Positions } | null>(null);
  const [error, setError] = useState<FieldError | null>(null);
  return {
    positions: draft?.positions ?? null,
    error,
    /** Opens the fields at `region`'s positions, on its chromosome. */
    open: (region: GenomicRegion) => {
      setDraft({ chromosome: region.chromosome, positions: positionsOf(region) });
      setError(null);
    },
    close: () => {
      setDraft(null);
      setError(null);
    },
    change: (field: keyof Positions, value: string) => {
      if (draft) setDraft({ ...draft, positions: { ...draft.positions, [field]: value } });
      if (error?.field === field) setError(null);
    },
    /** The typed region, or undefined after showing why there is none. */
    read: (assembly: AssemblyDefinition) => {
      if (!draft) return undefined;
      const result = regionFromPositions(draft.chromosome, draft.positions, assembly);
      if (result.ok) return result.region;
      setError({ field: result.field, text: result.error });
      return undefined;
    },
    /** Shows `text` against `field`, such as when the browser refuses the region. */
    fail: (field: keyof Positions, text: string) => setError({ field, text }),
  };
}

export type Coordinates = ReturnType<typeof useCoordinates>;

type CoordinateFieldsProps = {
  coordinates: Coordinates & { positions: Positions };
  /** Called by Escape, and by Cancel, which close the coordinates but not what holds them. */
  onCancel: () => void;
  /** Draws a border around the fields, to set them apart within a larger form. */
  framed?: boolean;
};

/** Start and end positions, the error that keeps them from applying, then Apply and Cancel. */
export function CoordinateFields({ coordinates, onCancel, framed = true }: CoordinateFieldsProps) {
  const { positions, error, change } = coordinates;
  const errorId = useId();
  const field = (key: keyof Positions, label: string) => {
    const invalid = error?.field === key;
    return (
      <TextField
        label={label}
        value={positions[key]}
        onChange={(event) => change(key, event.target.value)}
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
      component="fieldset"
      variant="outlined"
      aria-label="Coordinates"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Escape here leaves the coordinates, not what holds them.
        event.stopPropagation();
        onCancel();
      }}
      sx={{
        ...formCardSx,
        m: 0,
        minWidth: 0,
        ...(framed ? {} : { border: 0, bgcolor: "transparent" }),
      }}
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

/** Whether the coordinates are open, narrowing them for `CoordinateFields`. */
export const isOpen = (
  coordinates: Coordinates,
): coordinates is Coordinates & { positions: Positions } => coordinates.positions !== null;
