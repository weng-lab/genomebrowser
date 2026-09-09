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
          min={6}
          validate={(value) =>
            value >= 6 && value <= 100 ? undefined : "Enter a value from 6 to 100."
          }
          onCommit={(value) => updateTrack({ config: { sequenceMinPixelsPerBase: value } })}
        />
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
