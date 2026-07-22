import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  text: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
};

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {onConfirm ? <Button onClick={onClose}>{cancelLabel}</Button> : null}
        <Button
          color={onConfirm ? "secondary" : "primary"}
          variant="contained"
          onClick={onConfirm ?? onClose}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
