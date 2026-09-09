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
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 2,
            }}
          >
            <Typography variant="body2">Show DNA letters below</Typography>
            <Typography variant="body2" color="primary" aria-live="polite">
              {sequenceSpan.toLocaleString("en-US")} bp
            </Typography>
          </Box>
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
              Farther out
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Closer in
            </Typography>
          </Box>
        </Box>
        {visibility.error && (
          <Typography color="error" variant="caption">
            {visibility.error}
          </Typography>
        )}
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}
        >
          <Typography variant="body2">Highlight color</Typography>
          <Box sx={{ width: 180, maxWidth: "55%" }}>
            <TrackSettingsColorField
              label="Sequence highlight color"
              value={track.config.sequenceHighlightColor}
              onCommit={(value) => updateTrack({ config: { sequenceHighlightColor: value } })}
            />
          </Box>
        </Box>
        <FormControlLabel
          labelPlacement="start"
          sx={{ m: 0, justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}
          control={
            <Checkbox
              size="small"
              sx={{ p: 0, mt: 0.25 }}
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {!track.config.sequenceUrl
              ? "Add a reference source to show DNA letters."
              : sequenceSpan < 1
                ? "Increase track width to show reference bases."
                : currentSpan > sequenceSpan
                  ? "Currently too far out to render letters."
                  : "Current view is within the sequence threshold."}
          </Typography>
          <Button
            size="small"
            sx={{ flexShrink: 0 }}
            disabled={!track.config.sequenceUrl || sequenceSpan < 1 || currentSpan <= sequenceSpan}
            onClick={() => zoom(sequenceSpan / currentSpan)}
          >
            Zoom in to sequence
          </Button>
        </Box>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
