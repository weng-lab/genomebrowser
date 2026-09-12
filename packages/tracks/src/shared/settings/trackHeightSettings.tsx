import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackDimensionField } from "./trackDimensionField";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";

export function TrackHeightSettings<Config, Item>({
  track,
  updateTrack,
  updateTracksOfType,
}: TrackSettingsProps<Config, Item>) {
  return (
    <TrackSettingsFieldRow>
      <TrackDimensionField
        label="Height"
        min={20}
        value={track.base.height}
        validate={(height) => (height >= 20 ? undefined : "Enter a height of at least 20.")}
        onCommit={(height) => updateTrack({ base: { height } })}
        onApplyToAll={(height) => updateTracksOfType(() => ({ base: { height } }))}
      />
    </TrackSettingsFieldRow>
  );
}
