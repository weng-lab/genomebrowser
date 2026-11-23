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
import type { TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { TrackSortOptionPicker } from "./trackSortOptionPicker";
import {
  applyTrackSort,
  trackSortValueTypes,
  type TrackSortDirection,
  type TrackSortOption,
} from "./trackSortOrder";
import { TrackSortPriorityList } from "./trackSortPriorityList";

/** One level of the dialog's sort, by option ID. */
type SortLevel = { id: string; direction: TrackSortDirection };

export type TrackSortDialogProps = {
  trackStore: TrackStoreInstance;
  open: boolean;
  onClose: () => void;
  /** The options people can add to the sort, listed in this order. */
  options: readonly TrackSortOption[];
  title?: string;
};

export function TrackSortDialog({
  trackStore,
  open,
  onClose,
  options,
  title = "Sort Tracks",
}: TrackSortDialogProps) {
  // The sort last applied to the track store, empty until the first Apply. Each opening
  // drafts from it, so Cancel discards an unfinished arrangement.
  const [applied, setApplied] = useState<readonly SortLevel[]>([]);
  // MUI handles Escape before it reaches the drag sensors, so disable dialog
  // closing on Escape while a row is moving; Escape then cancels the move.
  const [moving, setMoving] = useState(false);

  const applySort = (levels: readonly SortLevel[]) => {
    const rules = levels.flatMap(({ id, direction }) => {
      const option = options.find((candidate) => candidate.id === id);
      return option ? [{ option, direction }] : [];
    });
    // The store is read at apply time rather than subscribed to, so track changes do not
    // re-render the dialog.
    applyTrackSort(trackStore, rules);
    setApplied(rules.map(({ option, direction }) => ({ id: option.id, direction })));
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
        trackStore={trackStore}
        options={options}
        initialLevels={applied}
        onCancel={onClose}
        onApply={applySort}
        onMovingChange={setMoving}
      />
    </Dialog>
  );
}

function TrackSortDialogContent({
  trackStore,
  options,
  initialLevels,
  onCancel,
  onApply,
  onMovingChange,
}: {
  trackStore: TrackStoreInstance;
  options: readonly TrackSortOption[];
  initialLevels: readonly SortLevel[];
  onCancel: () => void;
  onApply: (levels: readonly SortLevel[]) => void;
  onMovingChange: (moving: boolean) => void;
}) {
  // Options no longer offered, such as a field whose tracks were removed, drop out.
  const [levels, setLevels] = useState(() =>
    initialLevels.filter(({ id }) => options.some((option) => option.id === id)),
  );
  // The kinds of value each option holds, read once as the dialog opens, like the options.
  const [valueTypes] = useState(() => trackSortValueTypes(trackStore, options));
  const described = options.map(({ id, label }) => ({
    id,
    label,
    types: valueTypes.get(id) ?? [],
  }));
  const rows = levels.flatMap(({ id, direction }) => {
    const option = described.find((candidate) => candidate.id === id);
    return option ? [{ ...option, direction }] : [];
  });

  const add = (id: string) => setLevels((current) => [...current, { id, direction: "ascending" }]);
  const remove = (id: string) => setLevels((current) => current.filter((level) => level.id !== id));
  const reorder = (ids: readonly string[]) =>
    setLevels((current) => ids.flatMap((id) => current.find((level) => level.id === id) ?? []));
  const setDirection = (id: string, direction: TrackSortDirection) =>
    setLevels((current) =>
      current.map((level) => (level.id === id ? { ...level, direction } : level)),
    );

  return (
    <>
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>
          Add the options to sort by, then drag them to set their priority — tracks group by the top
          option first, breaking ties with the option below it. Tracks without a value go last.
        </Typography>
        <TrackSortOptionPicker
          options={described}
          includedIds={levels.map(({ id }) => id)}
          onAdd={add}
        />
        <TrackSortPriorityList
          options={rows}
          onReorder={reorder}
          onDirectionChange={setDirection}
          onRemove={remove}
          onMovingChange={onMovingChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={levels.length === 0} onClick={() => onApply(levels)}>
          Apply order
        </Button>
      </DialogActions>
    </>
  );
}
