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
        <Typography variant="body2" color="text.secondary">
          Bases appear when each has at least this much horizontal space. At 5 pixels per base, a
          1,000-pixel track shows sequence across 200 bp; a 2,000-pixel track across 400 bp. Lower
          values show sequence sooner; higher values require more zoom.
        </Typography>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
