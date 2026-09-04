import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { AddHighlightForm } from "./addHighlightForm";
import { HighlightDialogHeader } from "./highlightDialogHeader";
import { HighlightList } from "./highlightList";

export type HighlightDialogProps = {
  browserStore: BrowserStoreInstance;
  open: boolean;
  onClose: () => void;
};

export function HighlightDialog({ browserStore, open, onClose }: HighlightDialogProps) {
  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
    >
      <HighlightDialogHeader onClose={onClose} />
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ pt: 1 }}>
          <HighlightList browserStore={browserStore} />
        </Box>
        <AddHighlightForm browserStore={browserStore} />
      </DialogContent>
    </Dialog>
  );
}
