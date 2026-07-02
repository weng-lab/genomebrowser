import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type ResetDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ResetDialog({ open, onClose, onConfirm }: ResetDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reset selection?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will reset the draft selection back to the current track store.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="secondary" variant="contained" onClick={onConfirm}>
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
}
