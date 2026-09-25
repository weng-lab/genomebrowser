import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  TrackBaseSettings,
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
  TrackSettingsLayout,
  TrackSettingsSection,
  TrackSettingsUrlField,
} from "../shared/settings";
import { TrackHeightSettings } from "../shared/settings/trackHeightSettings";
import type { SignalPoint } from "../shared/signal";
import type { BigWigConfig } from "./types";
import { SignalSettings } from "./signalSettings";

type Props = TrackSettingsProps<BigWigConfig, SignalPoint>;
export function BigWigSettings({ track, updateTrack, ...settings }: Props) {
  const { config } = track;
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackHeightSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              disabled={track.source === "host"}
              required
              value={config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <SignalSettings config={config} onChange={(config) => updateTrack({ config })} />
    </TrackSettingsLayout>
  );
}
