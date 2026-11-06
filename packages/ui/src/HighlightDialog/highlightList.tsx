import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { resolveHighlight, type BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog/confirmDialog";
import { HighlightCard } from "./highlightCard";

export function HighlightList({
  browserStore,
  onEdit,
}: {
  browserStore: BrowserStoreInstance;
  onEdit: (id: string) => void;
}) {
  const useBrowserStore = browserStore;
  const currentChromosome = useBrowserStore((state) => state.region.chromosome);
  const highlights = useBrowserStore((state) => state.highlights);
  const removeHighlight = useBrowserStore((state) => state.removeHighlight);
  const clearHighlights = useBrowserStore((state) => state.clearHighlights);
  const setRegion = useBrowserStore((state) => state.setRegion);

  if (highlights.length === 0) {
    return (
      <Paper elevation={0} sx={{ bgcolor: "action.hover", borderRadius: 2, px: 1.5, py: 1.25 }}>
        <Typography color="text.secondary" variant="body2">
          No highlights added.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Box sx={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <Typography color="text.secondary" variant="caption">
          Newest first
        </Typography>
        <RemoveAllButton onRemoveAll={clearHighlights} />
      </Box>
      {highlights.toReversed().map((highlight) => {
        const { region } = resolveHighlight(highlight, currentChromosome);
        return (
          <HighlightCard
            highlight={highlight}
            key={highlight.id}
            onEdit={() => onEdit(highlight.id)}
            onNavigate={() => setRegion(region)}
            onRemove={() => removeHighlight(highlight.id)}
            region={region}
          />
        );
      })}
    </Stack>
  );
}

function RemoveAllButton({ onRemoveAll }: { onRemoveAll: () => void }) {
  const [confirming, setConfirming] = useState(false);

  function confirmRemoveAll() {
    onRemoveAll();
    setConfirming(false);
  }

  return (
    <>
      <Button color="error" onClick={() => setConfirming(true)} size="small">
        Remove all
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Remove all highlights?"
        text="This will remove every highlight from the browser."
        confirmLabel="Remove all"
        confirmColor="error"
        onClose={() => setConfirming(false)}
        onConfirm={confirmRemoveAll}
      />
    </>
  );
}
