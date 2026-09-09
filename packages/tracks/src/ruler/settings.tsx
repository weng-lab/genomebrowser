import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { useBrowserStore, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { useDraftController } from "../shared/settings/draftInput";
import type { RulerConfig } from "./schema";

export function RulerSettings({ track, updateTrack }: TrackSettingsProps<RulerConfig>) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const region = useBrowserStore((state) => state.region);
  const zoom = useBrowserStore((state) => state.zoom);
  const visibility = useDraftController<number, number>({
    value: track.config.sequenceMinPixelsPerBase,
    toRaw: (value) => value,
    validate: (value) => ({ ok: true, value }),
    isEqual: Object.is,
    debounceMs: false,
    onCommit: (value) => updateTrack({ config: { sequenceMinPixelsPerBase: value } }),
  });
  const sequenceSpan = Math.floor(trackWidth / visibility.value);
  const currentSpan = region.end - region.start;

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Reference source">
        <TrackSettingsUrlField
          label="2bit URL"
          value={track.config.sequenceUrl ?? ""}
          disabled={track.source === "host"}
          onCommit={(value) => updateTrack({ config: { sequenceUrl: value || undefined } })}
        />
      </TrackSettingsSection>
      <TrackSettingsSection title="Sequence display">
        <Box sx={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
            <Typography variant="body2">When to show DNA letters</Typography>
            <Slider
              aria-label="When to show DNA letters"
              min={5}
              max={25}
              step={1}
              value={visibility.value}
              onChange={(_, value) => {
                if (typeof value === "number") visibility.change(value);
              }}
              onChangeCommitted={(_, value) => {
                if (typeof value === "number") visibility.submit(value);
              }}
              getAriaValueText={(value) =>
                `Sequence appears at ${Math.floor(trackWidth / value)} base pairs or less`
              }
              sx={{ py: 1 }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Zoomed farther out
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Zoomed closer in
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="outlined"
            sx={{ minHeight: 40, flexShrink: 0 }}
            disabled={!track.config.sequenceUrl || sequenceSpan < 1 || currentSpan <= sequenceSpan}
            onClick={() => zoom(sequenceSpan / currentSpan)}
          >
            Zoom in to sequence
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {sequenceSpan >= 1
            ? `Sequence appears at ${sequenceSpan.toLocaleString("en-US")} bp or less.`
            : "Increase track width to show reference bases."}
        </Typography>
        {visibility.error && (
          <Typography color="error" variant="caption">
            {visibility.error}
          </Typography>
        )}
        <TrackSettingsColorField
          label="Sequence highlight color"
          value={track.config.sequenceHighlightColor}
          onCommit={(value) => updateTrack({ config: { sequenceHighlightColor: value } })}
        />
        <FormControlLabel
          sx={{ m: 0, alignItems: "flex-start" }}
          control={
            <Checkbox
              size="small"
              sx={{ p: 0, mr: 1, mt: 0.25 }}
              checked={track.config.distinguishMaskedBases}
              onChange={(_, checked) =>
                updateTrack({ config: { distinguishMaskedBases: checked } })
              }
            />
          }
          label={
            <Box>
              <Typography variant="body2">Distinguish masked bases</Typography>
              <Typography variant="caption" color="text.secondary">
                Show soft-masked regions in lowercase.
              </Typography>
            </Box>
          }
        />
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
