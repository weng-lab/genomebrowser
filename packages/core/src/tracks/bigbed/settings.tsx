import type { CSSProperties } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigBedConfig, BigBedRow } from "./types";

export function BigBedSettings({
  track,
  updateTrack,
}: TrackSettingsProps<BigBedConfig, BigBedRow>) {
  return (
    <SettingsSection title="BigBed">
      <label style={fieldStyle}>
        URL
        <input
          type="text"
          value={track.config.url}
          onChange={(event) => updateTrack({ config: { url: event.target.value } })}
        />
      </label>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
