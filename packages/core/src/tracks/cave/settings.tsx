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
      <CaveColorField
        color={track.config.topColor}
        configKey="topColor"
        label="Top color"
        updateTrack={updateTrack}
      />
      <CaveColorField
        color={track.config.bottomColor}
        configKey="bottomColor"
        label="Bottom color"
        updateTrack={updateTrack}
      />
    </SettingsSection>
  );
}

function CaveColorField({
  color,
  configKey,
  label,
  updateTrack,
}: {
  color: string;
  configKey: "topColor" | "bottomColor";
  label: string;
  updateTrack: TrackSettingsProps<CaveConfig, CaveTooltipItem>["updateTrack"];
}) {
  return (
    <label style={fieldStyle}>
      {label}
      <DraftColorInput
        value={color}
        onCommit={(value) => updateTrack({ config: { [configKey]: value } })}
      />
    </label>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
