import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactNode } from "react";
import { dialogActionsSx } from "./dialogLayout";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  text: ReactNode;
  /** The filled button, such as "Delete group". */
  confirmLabel: string;
  /** `danger` fills the confirm button red, for actions that cannot be undone. */
  tone?: "default" | "danger";
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** Other choices, shown between cancel and confirm. */
  actions?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * A dialog that asks before an action, such as a delete: a title, a sentence or two, Cancel,
 * and a filled confirm button. Confirming closes the dialog, then runs the action.
 */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  tone = "default",
  cancelLabel = "Cancel",
  actions,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onClose}>{cancelLabel}</Button>
        {actions}
        <Button
          variant="contained"
          color={tone === "danger" ? "error" : "primary"}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
