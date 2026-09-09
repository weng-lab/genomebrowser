import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import type { RulerConfig } from "./schema";

export function RulerSettings({ track, updateTrack }: TrackSettingsProps<RulerConfig>) {
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
