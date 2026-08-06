import { useSettingsStore, useTrackStore, type BigBedConfig } from "@weng-lab/genomebrowser";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

export function BigBedSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const url = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigBedConfig | undefined)?.url ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigBed">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={url}
              onCommit={(nextUrl) => updateTrack(trackId, { config: { url: nextUrl } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
