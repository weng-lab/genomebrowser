import type { CSSProperties } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigBedConfig } from "./types";

export function BigBedSettings({ config, updateConfig }: TrackSettingsProps<BigBedConfig>) {
  return (
    <SettingsSection title="BigBed">
      <label style={fieldStyle}>
        URL
        <input
          type="text"
          value={config.url}
          onChange={(event) => updateConfig({ url: event.target.value })}
        />
      </label>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
