import type { CSSProperties } from "react";
import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { CaveConfig, CaveTooltipItem } from "./types";

export function CaveSettings({
  track,
  updateTrack,
}: TrackSettingsProps<CaveConfig, CaveTooltipItem>) {
  return (
    <SettingsSection title="CAVE">
      <label style={fieldStyle}>
        Top color
        <DraftColorInput
          value={track.config.topColor}
          onCommit={(topColor) => updateTrack({ config: { topColor } })}
        />
      </label>
      <label style={fieldStyle}>
        Bottom color
        <DraftColorInput
          value={track.config.bottomColor}
          onCommit={(bottomColor) => updateTrack({ config: { bottomColor } })}
        />
      </label>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
