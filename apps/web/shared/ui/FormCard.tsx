import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import type { ReactNode } from "react";

type FormCardProps = {
  id?: string;
  /** The form's accessible name. */
  label: string;
  onSubmit: () => void;
  /** Called by Escape, and by the actions' Cancel button. */
  onCancel: () => void;
  children: ReactNode;
};

/**
 * A short form on a bordered card, set into a panel below what opened it, such as a section
 * header's add button. Escape cancels.
 */
export function FormCard({ id, label, onSubmit, onCancel, children }: FormCardProps) {
  return (
    <Paper
      id={id}
      component="form"
      variant="outlined"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      sx={{ ...formCardSx, bgcolor: "background.default" }}
    >
      {children}
    </Paper>
  );
}

/** The card's bordered column, for a group of fields set into a form card as well. */
export const formCardSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 1.5,
  p: 1.5,
  borderRadius: 2,
} as const;

type FormCardActionsProps = {
  submitLabel: string;
  onCancel: () => void;
  /** Which end of the card the buttons sit at. Defaults to the start. */
  align?: "start" | "end";
};

/** The card's submit button, then Cancel. */
export function FormCardActions({ submitLabel, onCancel, align = "start" }: FormCardActionsProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: `flex-${align}`, gap: 1 }}>
      <Button type="submit" variant="contained" size="small" disableElevation sx={formButtonSx}>
        {submitLabel}
      </Button>
      <Button size="small" onClick={onCancel} sx={{ ...formButtonSx, color: "text.primary" }}>
        Cancel
      </Button>
    </Box>
  );
}

/** Sentence-case labels on rounded buttons, for every button on a form card. */
export const formButtonSx = {
  px: 1.5,
  borderRadius: 2,
  textTransform: "none",
  typography: "body2",
  whiteSpace: "nowrap",
} as const;
