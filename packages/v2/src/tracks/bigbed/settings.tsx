import type { CSSProperties } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigBedConfig } from "./types";

export function BigBedSettings({ config, updateTrack }: TrackSettingsProps<BigBedConfig>) {
  return (
    <SettingsSection title="BigBed">
      <label style={fieldStyle}>
        URL
        <input
          type="text"
          value={config.url}
          onChange={(event) => updateTrack({ url: event.target.value })}
        />
      </label>
      <div style={fieldStyle}>
        <div>Schema</div>
        <div>{config.schema ? "Custom schema attached" : "No custom schema"}</div>
        {config.schema && (
          <button type="button" onClick={() => updateTrack({ schema: undefined })}>
            Clear schema
          </button>
        )}
      </div>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
