import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsFieldGrid, TrackSettingsFullRow } from "../settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../settings/trackSettingsLayout";
import { TrackSettingsSection } from "../settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../settings/trackSettingsUrlField";
import type { BigBedConfig, BigBedRow } from "./types";

export function BigBedSettings({
  track,
  updateTrack,
}: TrackSettingsProps<BigBedConfig, BigBedRow>) {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigBed">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={track.config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
