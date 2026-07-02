import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type ClearDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folderLabel: string;
  clearAll: boolean;
};

export function ClearDialog({
  open,
  onClose,
  onConfirm,
  folderLabel,
  clearAll,
}: ClearDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Clear selected tracks?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {clearAll
            ? "This will clear all selected catalog tracks from the draft."
            : `This will clear selected tracks from ${folderLabel}.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="secondary" variant="contained" onClick={onConfirm}>
          Clear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
