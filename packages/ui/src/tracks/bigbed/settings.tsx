import type { BigBedConfig, BigBedRow, TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

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
