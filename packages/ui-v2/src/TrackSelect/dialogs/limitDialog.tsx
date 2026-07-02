import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type LimitDialogProps = {
  open: boolean;
  maxTracks: number;
  onClose: () => void;
};

export function LimitDialog({ open, maxTracks, onClose }: LimitDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Track limit reached</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Select {maxTracks.toLocaleString()} tracks or fewer.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
