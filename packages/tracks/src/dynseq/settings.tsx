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
import { SignalSettings } from "../bigwig/signalSettings";
import { BasePairDetailSettings } from "../shared/settings/basePairDetailSettings";
import type { DynseqConfig, DynseqItem } from "./types";

type Props = TrackSettingsProps<DynseqConfig, DynseqItem>;

export function DynseqSettings({ track, updateTrack, ...settings }: Props) {
  const { config } = track;
  const hosted = track.source === "host";

  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackHeightSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>

      <BasePairDetailSettings
        unavailableReason={
          track.base.display === "dense"
            ? "Choose Full display above to show letters on this track."
            : undefined
        }
      />

      <TrackSettingsSection title="Sources">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="Scores BigWig URL"
              disabled={hosted}
              required
              value={config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="Reference 2bit URL"
              disabled={hosted}
              required
              value={config.twoBitUrl}
              onCommit={(twoBitUrl) => updateTrack({ config: { twoBitUrl } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <SignalSettings config={config} onChange={(config) => updateTrack({ config })} />
    </TrackSettingsLayout>
  );
}
