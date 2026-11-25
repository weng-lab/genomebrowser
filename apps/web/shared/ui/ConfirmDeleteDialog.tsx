"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { formButtonSx } from "./FormCard";

type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** A narrower deletion offered beside the main one, such as keeping the open item. */
  alternative?: ConfirmDeleteAlternative;
  onClose: () => void;
};

export type ConfirmDeleteAlternative = { label: string; onConfirm: () => void };

/**
 * Asks before a deletion that cannot be undone, optionally offering a narrower one too.
 * Confirming either closes the dialog, then deletes.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  text,
  confirmLabel,
  onConfirm,
  alternative,
  onClose,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      {/* Whole buttons wrap on a narrow screen, never their labels. */}
      <DialogActions disableSpacing sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
        {alternative && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              onClose();
              alternative.onConfirm();
            }}
            // Set apart on the left, so the main choice stays beside Cancel.
            sx={{ ...formButtonSx, mr: "auto" }}
          >
            {alternative.label}
          </Button>
        )}
        <Button onClick={onClose} sx={{ ...formButtonSx, color: "text.primary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            onClose();
            onConfirm();
          }}
          sx={formButtonSx}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
