import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { HighlightForm } from "./highlightForm";
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
        <HighlightDialogContent browserStore={browserStore} />
      </DialogContent>
    </Dialog>
  );
}

function HighlightDialogContent({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const useBrowserStore = browserStore;
  const highlight = useBrowserStore((state) =>
    state.highlights.find((item) => item.id === editingId),
  );

  return highlight ? (
    <Box sx={{ pt: 1 }}>
      <Typography component="h3" variant="subtitle1" sx={{ mb: 1.5, overflowWrap: "anywhere" }}>
        Edit highlight: {highlight.id}
      </Typography>
      <HighlightForm
        key={highlight.id}
        browserStore={browserStore}
        initialHighlight={highlight}
        onSaved={() => setEditingId(null)}
        onCancel={() => setEditingId(null)}
      />
    </Box>
  ) : (
    <>
      <Box sx={{ pt: 1 }}>
        <HighlightList browserStore={browserStore} onEdit={setEditingId} />
      </Box>
      <AddHighlightForm browserStore={browserStore} />
    </>
  );
}
