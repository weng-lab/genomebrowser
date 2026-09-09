import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { useBrowserStore, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import type { RulerConfig } from "./schema";

export function RulerSettings({ track, updateTrack }: TrackSettingsProps<RulerConfig>) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const region = useBrowserStore((state) => state.region);
  const zoom = useBrowserStore((state) => state.zoom);
  const sequenceSpan = Math.floor(trackWidth / track.config.sequenceMinPixelsPerBase);
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
            <TrackSettingsNumberField
              label="Minimum pixels per base"
              value={track.config.sequenceMinPixelsPerBase}
              min={1}
              step="any"
              validate={(value) =>
                value >= 1 && value <= 100 ? undefined : "Enter a value from 1 to 100."
              }
              onCommit={(value) => updateTrack({ config: { sequenceMinPixelsPerBase: value } })}
            />
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
