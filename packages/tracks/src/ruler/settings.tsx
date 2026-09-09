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
      <TrackSettingsSection title="Reference sequence">
        <TrackSettingsUrlField
          label="2bit URL"
          value={track.config.sequenceUrl ?? ""}
          disabled={track.source === "host"}
          onCommit={(value) => updateTrack({ config: { sequenceUrl: value || undefined } })}
        />
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
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {sequenceSpan >= 1
            ? `Sequence appears at ${sequenceSpan.toLocaleString("en-US")} bp or less.`
            : "Increase track width to show reference bases."}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={!track.config.sequenceUrl || sequenceSpan < 1 || currentSpan <= sequenceSpan}
          onClick={() => zoom(sequenceSpan / currentSpan)}
        >
          Zoom to sequence
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              checked={track.config.distinguishMaskedBases}
              onChange={(_, checked) =>
                updateTrack({ config: { distinguishMaskedBases: checked } })
              }
            />
          }
          label="Distinguish masked bases"
        />
        <Typography variant="body2" color="text.secondary">
          Show soft-masked regions, often repetitive sequence, in lowercase.
        </Typography>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
