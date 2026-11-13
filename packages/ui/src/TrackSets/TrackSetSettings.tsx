import { useId, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  TrackSettingsPanel,
  useGenomeBrowser,
  type TrackMutationResult,
  type TrackSetSettingsProps,
} from "@weng-lab/genomebrowser";

/** Host this component through GenomeBrowser.trackSetSettingsComponent. */
export function TrackSetSettings({ trackSetId, closeSettings }: TrackSetSettingsProps) {
  const { useTrackStore } = useGenomeBrowser();
  const group = useTrackStore((state) => state.trackSets.find((set) => set.id === trackSetId));
  const order = useTrackStore((state) => state.order);
  const pinned = useTrackStore((state) => state.pinnedTrackIds);
  const update = useTrackStore((state) => state.updateTrackSet);
  const move = useTrackStore((state) => state.moveTrackSet);
  const ungroup = useTrackStore((state) => state.ungroupTrackSet);
  const setPinned = useTrackStore((state) => state.setPinnedTrackIds);
  const [error, setError] = useState("");
  const titleId = useId();
  const members = useMemo(() => new Set(group?.trackIds), [group]);
  const pinnedIds = useMemo(() => new Set(pinned), [pinned]);
  const childIds = useMemo(() => order.filter((id) => members.has(id)), [order, members]);
  if (!group) return null;
  const report = (result: TrackMutationResult) => setError(result.ok ? "" : result.error);
  const isPinned = childIds.some((id) => pinnedIds.has(id));
  const first = order.indexOf(childIds[0]);
  const last = order.indexOf(childIds.at(-1)!);
  return (
    <Dialog open onClose={closeSettings} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{group.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControlLabel
            label="Show track set"
            control={
              <Switch
                checked={group.visible}
                onChange={(_, visible) => report(update(group.id, { visible }))}
              />
            }
          />
          <TrackSetDisplay trackSetId={group.id} />
          <FormControlLabel
            label="Pin track set"
            control={
              <Checkbox
                checked={isPinned}
                onChange={(_, checked) =>
                  report(
                    setPinned(
                      checked ? [...pinned, ...childIds] : pinned.filter((id) => !members.has(id)),
                    ),
                  )
                }
              />
            }
          />
          <Typography variant="body2" color="text.secondary">
            Each child keeps its own data and settings. Hide the set to pause its data requests.
          </Typography>
          {childIds.map((id) => (
            <TrackSetChild key={id} trackId={id} scopeTrackIds={group.trackIds} />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button
          disabled={isPinned || first <= 0 || pinnedIds.has(order[first - 1])}
          onClick={() => report(move(group.id, "up"))}
        >
          Move up
        </Button>
        <Button
          disabled={isPinned || last === order.length - 1}
          onClick={() => report(move(group.id, "down"))}
        >
          Move down
        </Button>
        <Button
          onClick={() => {
            const result = ungroup(group.id);
            report(result);
            if (result.ok) closeSettings();
          }}
        >
          Ungroup
        </Button>
        <Button onClick={closeSettings}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
function TrackSetDisplay({ trackSetId }: { trackSetId: string }) {
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const group = useTrackStore((state) => state.trackSets.find((set) => set.id === trackSetId));
  const registry = useTrackStore((state) => state.registry);
  const members = useMemo(() => new Set(group?.trackIds), [group]);
  const types = useTrackStore(
    useShallow((state) =>
      state.tracks.filter((track) => members.has(track.base.id)).map((track) => track.type),
    ),
  );
  const displays = useTrackStore(
    useShallow((state) =>
      state.tracks.filter((track) => members.has(track.base.id)).map((track) => track.base.display),
    ),
  );
  const busy = useBrowserStore((state) => state.isLoading);
  const update = useTrackStore((state) => state.updateTrackSetDisplay);
  const [error, setError] = useState("");
  const supported = useMemo(() => {
    const lists = types.map((type) => registry.get(type).displays);
    return lists[0]?.filter((mode) => lists.every((list) => list.includes(mode))) ?? [];
  }, [types, registry]);
  const value = displays.every((mode) => mode === displays[0]) ? (displays[0] ?? "") : "";
  return (
    <TextField
      select
      fullWidth
      size="small"
      label="Display all children"
      value={value}
      disabled={busy || !supported.length}
      error={!!error}
      helperText={error || "Only modes supported by every child are shown."}
      onChange={(event) => {
        const result = update(trackSetId, event.target.value);
        setError(result.ok ? "" : result.error);
      }}
    >
      {value === "" && (
        <MenuItem value="" disabled>
          Mixed
        </MenuItem>
      )}
      {supported.map((mode) => (
        <MenuItem key={mode} value={mode}>
          {mode}
        </MenuItem>
      ))}
    </TextField>
  );
}
function TrackSetChild({
  trackId,
  scopeTrackIds,
}: {
  trackId: string;
  scopeTrackIds: readonly string[];
}) {
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const title = useTrackStore((state) => state.getTrack(trackId)?.base.title);
  const visible = useTrackStore((state) => !state.hiddenTrackIds.includes(trackId));
  const setVisibility = useTrackStore((state) => state.setTrackVisibility);
  const busy = useBrowserStore((state) => state.isLoading);
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
      <Checkbox
        sx={{ mt: 0.5 }}
        checked={visible}
        slotProps={{ input: { "aria-label": `Show ${title}` } }}
        onChange={(_, checked) => setVisibility(trackId, checked)}
      />
      <Accordion disableGutters sx={{ flex: 1, minWidth: 0 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">{title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <TrackSettingsPanel trackId={trackId} scopeTrackIds={scopeTrackIds} />
          </fieldset>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
