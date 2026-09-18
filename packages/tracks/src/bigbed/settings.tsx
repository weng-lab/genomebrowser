import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackRowLayoutSettings } from "../shared/settings/trackRowLayoutSettings";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import type { BigBedConfig, BigBedRow } from "./types";

export function BigBedSettings<Row extends BigBedRow = BigBedRow>({
  track,
  updateTrack,
  ...settings
}: TrackSettingsProps<BigBedConfig, Row>) {
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackRowLayoutSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <TrackSettingsSection title="BigBed">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              disabled={track.source === "host"}
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
