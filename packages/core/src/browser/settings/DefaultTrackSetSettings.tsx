import { useId, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SvgIcon from "@mui/material/SvgIcon";
import type { TrackMutationResult } from "../../modules/types";
import { useGenomeBrowser } from "../state/browserContextState";
import { getTrackSet } from "../state/trackSets";
import { TrackSettingsPanel } from "./TrackSettingsPanel";

/** Built-in track-set settings, mounted by the browser. */
export function DefaultTrackSetSettings({
  trackSetId,
  closeSettings,
}: {
  trackSetId: string;
  closeSettings: () => void;
}) {
  const { useTrackStore } = useGenomeBrowser();
  const trackSet = useTrackStore((state) => getTrackSet(trackSetId, state.trackSets));
  const order = useTrackStore((state) => state.order);
  const update = useTrackStore((state) => state.updateTrackSet);
  const removeTrackSet = useTrackStore((state) => state.ungroupTrackSet);
  const [error, setError] = useState("");
  const titleId = useId();
  const members = useMemo(() => new Set(trackSet?.trackIds), [trackSet]);
  const childIds = useMemo(() => order.filter((id) => members.has(id)), [order, members]);

  if (!trackSet) return null;

  const report = (result: TrackMutationResult) => setError(result.ok ? "" : result.error);

  return (
    <Dialog open onClose={closeSettings} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{trackSet.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControlLabel
            label="Show track set"
            control={
              <Switch
                checked={trackSet.visible}
                onChange={(_, visible) => report(update(trackSet.id, { visible }))}
              />
            }
          />
          <FormControlLabel
            label="Allow moving tracks into or out of this set"
            control={
              <Switch
                checked={trackSet.allowTrackTransfer !== false}
                onChange={(_, allowTrackTransfer) =>
                  report(update(trackSet.id, { allowTrackTransfer }))
                }
              />
            }
          />
          <TrackSetDisplay trackSetId={trackSet.id} />
          <Typography variant="body2" color="text.secondary">
            Each child keeps its own data and settings. Hide the track set to pause its data
            requests.
          </Typography>
          {childIds.map((id) => (
            <TrackSetChild key={id} trackId={id} scopeTrackIds={trackSet.trackIds} />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button
          title="Keep all member tracks as standalone tracks"
          onClick={() => {
            const result = removeTrackSet(trackSet.id);
            report(result);
            if (result.ok) closeSettings();
          }}
        >
          Remove track set
        </Button>
        <Button onClick={closeSettings}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
function TrackSetDisplay({ trackSetId }: { trackSetId: string }) {
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const trackSet = useTrackStore((state) => getTrackSet(trackSetId, state.trackSets));
  const registry = useTrackStore((state) => state.registry);
  const members = useMemo(() => new Set(trackSet?.trackIds), [trackSet]);
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
        <AccordionSummary
          expandIcon={
            <SvgIcon>
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </SvgIcon>
          }
        >
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
