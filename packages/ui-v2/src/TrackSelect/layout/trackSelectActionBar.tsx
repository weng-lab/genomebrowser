import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useState } from "react";
import { ConfirmDialog } from "../dialogs/confirmDialog";
import { useTrackSelect } from "../session/trackSelectContext";

type ActionDialog = "clear" | "reset" | null;

export function TrackSelectActionBar() {
  const [dialog, setDialog] = useState<ActionDialog>(null);
  const { state, actions } = useTrackSelect();
  const clearAll = state.screen === "catalog-list";
  const catalogLabel = state.activeCatalog?.label ?? "tracks";

  function confirmClear() {
    actions.clearDraftSelection();
    setDialog(null);
  }

  function confirmReset() {
    actions.resetDraftSelection();
    setDialog(null);
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => setDialog("clear")}
          >
            Clear
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => setDialog("reset")}
          >
            Reset
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" onClick={actions.cancel}>
            Cancel
          </Button>
          <Button variant="contained" size="small" onClick={actions.submitSelection}>
            Submit
          </Button>
        </Box>
      </Box>
      <ConfirmDialog
        open={dialog === "clear"}
        title="Clear selected tracks?"
        text={
          clearAll
            ? "This will clear all selected catalog tracks from the draft."
            : `This will clear selected tracks from ${catalogLabel}.`
        }
        confirmLabel="Clear"
        onClose={() => setDialog(null)}
        onConfirm={confirmClear}
      />
      <ConfirmDialog
        open={dialog === "reset"}
        title="Reset selection?"
        text="This will restore the configured defaults, or clear the catalog selection when no defaults are configured."
        confirmLabel="Reset"
        onClose={() => setDialog(null)}
        onConfirm={confirmReset}
      />
    </>
  );
}
