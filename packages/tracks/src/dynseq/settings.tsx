import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  TrackBaseSettings,
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
  TrackSettingsLayout,
  TrackSettingsNumberField,
  TrackSettingsSection,
  TrackSettingsUrlField,
} from "../shared/settings";
import { TrackHeightSettings } from "../shared/settings/trackHeightSettings";
import type { DynseqConfig, DynseqPoint } from "./types";

type Props = TrackSettingsProps<DynseqConfig, DynseqPoint>;

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

      <TrackSettingsSection title="dynseq source">
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

      <TrackSettingsSection title="Letters">
        <TrackSettingsFieldGrid>
          <TrackSettingsNumberField
            label="Letters below (bp)"
            min={1}
            step={1}
            inputMode="numeric"
            value={config.maxLetterBases}
            validate={(value) =>
              Number.isInteger(value) && value >= 1 ? undefined : "Enter a whole number of bases."
            }
            onCommit={(maxLetterBases) => updateTrack({ config: { maxLetterBases } })}
          />
          <TrackSettingsNumberField
            label="Minimum pixels per base"
            min={1}
            step="any"
            value={config.minPixelsPerBase}
            validate={(value) => (value > 0 ? undefined : "Enter a positive number of pixels.")}
            onCommit={(minPixelsPerBase) => updateTrack({ config: { minPixelsPerBase } })}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
