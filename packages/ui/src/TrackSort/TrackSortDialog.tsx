import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import type { AnyTrackInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { TrackSortOptionChips } from "./trackSortOptionChips";
import { TrackSortOptionPicker } from "./trackSortOptionPicker";
import { getSortedTrackIds, type TrackSortOption } from "./trackSortOrder";
import { TrackSortPriorityList } from "./trackSortPriorityList";

// Beyond this many options, chips wrap onto several lines, so a single-line picker replaces them.
const MAX_CHIP_OPTIONS = 5;

export type TrackSortDialogProps<Metadata> = {
  trackStore: TrackStoreInstance;
  open: boolean;
  onClose: () => void;
  /** Sort criteria, initially all included in this priority order. */
  options: readonly TrackSortOption<Metadata>[];
  /** Returns the metadata the options compare, or `undefined` to leave a track where it is. */
  getMetadata: (track: AnyTrackInstance) => Metadata | undefined;
  title?: string;
};

export function TrackSortDialog<Metadata>({
  trackStore,
  open,
  onClose,
  options,
  getMetadata,
  title = "Sort Tracks",
}: TrackSortDialogProps<Metadata>) {
  // The priority last applied to the track store. Each opening drafts from it,
  // so Cancel discards an unfinished arrangement.
  const [appliedIds, setAppliedIds] = useState<readonly string[]>(() =>
    options.map(({ id }) => id),
  );
  // MUI handles Escape before it reaches the drag sensors, so disable dialog
  // closing on Escape while a row is moving; Escape then cancels the move.
  const [moving, setMoving] = useState(false);

  const applySort = (includedIds: readonly string[]) => {
    const comparators = includedIds.flatMap(
      (id) => options.find((option) => option.id === id)?.compare ?? [],
    );
    // Read tracks at apply time rather than subscribing, so track changes do not
    // re-render the dialog.
    const { tracks, pinnedTrackIds, reorderTracks } = trackStore.getState();
    reorderTracks(getSortedTrackIds(tracks, pinnedTrackIds, getMetadata, comparators));
    setAppliedIds(includedIds);
    onClose();
  };

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      disableEscapeKeyDown={moving}
      slotProps={{
        paper: { sx: { borderRadius: 1.5, minHeight: 400 } },
        // A move interrupted by closing never reports its end.
        transition: { onExited: () => setMoving(false) },
      }}
    >
      <DialogTitle
        sx={{
          alignItems: "center",
          bgcolor: "primary.dark",
          color: "primary.contrastText",
          display: "flex",
          fontWeight: 700,
          justifyContent: "space-between",
          py: 1.25,
          pr: 1,
        }}
      >
        {title}
        <IconButton
          aria-label="Close track sorting"
          onClick={onClose}
          sx={{ color: "primary.contrastText" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {/* The dialog unmounts its content when closed, resetting the draft for the next opening. */}
      <TrackSortDialogContent
        options={options}
        initialIds={appliedIds}
        onCancel={onClose}
        onApply={applySort}
        onMovingChange={setMoving}
      />
    </Dialog>
  );
}

function TrackSortDialogContent({
  options,
  initialIds,
  onCancel,
  onApply,
  onMovingChange,
}: {
  options: readonly { id: string; label: string }[];
  initialIds: readonly string[];
  onCancel: () => void;
  onApply: (includedIds: readonly string[]) => void;
  onMovingChange: (moving: boolean) => void;
}) {
  const [includedIds, setIncludedIds] = useState(initialIds);
  const includedOptions = includedIds.flatMap(
    (id) => options.find((option) => option.id === id) ?? [],
  );

  const showChips = options.length <= MAX_CHIP_OPTIONS;

  const toggleOption = (id: string) => {
    setIncludedIds((current) =>
      current.includes(id) ? current.filter((includedId) => includedId !== id) : [...current, id],
    );
  };

  return (
    <>
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>
          {showChips
            ? "Click an option to leave it out of the sort. "
            : "Add the options to sort by, and remove any you do not need. "}
          Drag them to set their priority — tracks group by the top option first, breaking ties with
          the option below it.
        </Typography>
        {showChips ? (
          <TrackSortOptionChips
            options={options}
            includedIds={includedIds}
            onToggle={toggleOption}
          />
        ) : (
          <TrackSortOptionPicker options={options} includedIds={includedIds} onAdd={toggleOption} />
        )}
        <TrackSortPriorityList
          options={includedOptions}
          onReorder={setIncludedIds}
          onRemove={showChips ? undefined : toggleOption}
          onMovingChange={onMovingChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={() => onApply(includedIds)}>
          Apply order
        </Button>
      </DialogActions>
    </>
  );
}
