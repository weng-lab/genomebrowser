"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { BrowserStoreInstance, Highlight } from "@weng-lab/genomebrowser";
import { HighlightForm } from "@weng-lab/genomebrowser-ui";

type RegionDialogProps = {
  browserStore: BrowserStoreInstance;
  highlight: Highlight;
  open: boolean;
  onClose: () => void;
};

/**
 * Edits a saved region with the Manage highlights form: its name (the highlight's ID),
 * coordinates, fill type, color, and opacity.
 */
export function RegionDialog({ browserStore, highlight, open, onClose }: RegionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit region</DialogTitle>
      {/* The dialog unmounts its content once closed, so each opening starts from the region. */}
      <DialogContent sx={{ "&&": { pt: 1 } }}>
        <HighlightForm
          browserStore={browserStore}
          initialHighlight={highlight}
          onSaved={onClose}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
