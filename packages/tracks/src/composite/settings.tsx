import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  TrackSettings,
  useGenomeBrowser,
  type CompositeTrack,
  type TrackSettingsProps,
  type TrackMutationResult,
} from "@weng-lab/genomebrowser";
import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsFieldGrid } from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";

export function CompositeSettings({
  track,
  updateTrack,
  displayOptions,
}: TrackSettingsProps<CompositeTrack["config"]>) {
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const children = useTrackStore((state) => state.getTrack(track.base.id)?.tracks);
  const blocked = useBrowserStore((state) => state.isLoading);
  const [selectedId, setSelectedId] = useState("");
  const selected = children?.find((child) => child.base.id === selectedId) ?? children?.[0];
  const [error, setError] = useState<string>();
  const mutate = (operation: () => TrackMutationResult) => {
    if (useBrowserStore.getState().isLoading) return;
    const result = operation();
    setError(result.ok ? undefined : result.error);
  };
  const structuralDisabled = blocked || track.source === "host";
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings track={track} updateTrack={updateTrack} displayOptions={[]} />
      <TrackSettingsSection title="Composite layout">
        <TrackSettingsFieldGrid>
          <TextField
            select
            fullWidth
            size="small"
            label="Layout"
            value={track.base.display}
            onChange={(event) =>
              mutate(() => updateTrack({ base: { display: event.target.value } }))
            }
          >
            {displayOptions.map((display) => (
              <MenuItem key={display} value={display}>
                {display}
              </MenuItem>
            ))}
          </TextField>
          <TrackSettingsNumberField
            label="Overlay height"
            min={1}
            value={track.base.height}
            validate={(value) => (value > 0 ? undefined : "Enter a positive height.")}
            onCommit={(height) => updateTrack({ base: { height } })}
          />
          <TrackSettingsNumberField
            label="Gap"
            min={0}
            value={track.config.gap}
            validate={(value) => (value >= 0 ? undefined : "Enter a non-negative gap.")}
            onCommit={(gap) => updateTrack({ config: { gap } })}
          />
          <TrackSettingsNumberField
            label="Opacity"
            min={0}
            step={0.1}
            value={track.config.opacity}
            validate={(value) =>
              value >= 0 && value <= 1 ? undefined : "Enter a value between 0 and 1."
            }
            onCommit={(opacity) => updateTrack({ config: { opacity } })}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Child tracks">
        <TextField
          select
          fullWidth
          size="small"
          label="Child track"
          value={selected?.base.id ?? ""}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {children?.map((child) => (
            <MenuItem key={child.base.id} value={child.base.id}>
              {child.base.title}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
          <Button
            size="small"
            disabled={structuralDisabled || !selected}
            onClick={() =>
              selected &&
              mutate(() =>
                useTrackStore.getState().extractTracks(track.base.id, [selected.base.id]),
              )
            }
          >
            Extract child track
          </Button>
          <Button
            size="small"
            disabled={structuralDisabled}
            onClick={() => mutate(() => useTrackStore.getState().ungroupTrack(track.base.id))}
          >
            Ungroup tracks
          </Button>
          <Button
            size="small"
            disabled={structuralDisabled || !selected || children?.[0] === selected}
            onClick={() => {
              if (!selected || !children) return;
              const ids = children.map((child) => child.base.id);
              const index = ids.indexOf(selected.base.id);
              [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
              mutate(() => useTrackStore.getState().reorderChildren(track.base.id, ids));
            }}
          >
            Move child earlier
          </Button>
        </Box>
      </TrackSettingsSection>
      {error && <Alert severity="error">{error}</Alert>}
      {selected && <TrackSettings key={selected.base.id} trackId={selected.base.id} />}
    </TrackSettingsLayout>
  );
}
