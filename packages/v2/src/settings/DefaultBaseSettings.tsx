import type { CSSProperties } from "react";
import { SettingsSection } from "./SettingsSection";
import { isHexColor } from "./settingsColor";
import type { BaseSettingsProps } from "./types";

export function DefaultBaseSettings({ config, displayOptions, updateTrack }: BaseSettingsProps) {
  return (
    <SettingsSection title="Track">
      <label style={fieldStyle}>
        Title
        <input
          type="text"
          value={config.title}
          onChange={(event) => updateTrack({ title: event.target.value })}
        />
      </label>
      <label style={fieldStyle}>
        Color
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="color"
            value={isHexColor(config.color) ? config.color : "#000000"}
            onChange={(event) => updateTrack({ color: event.target.value })}
          />
          <input
            type="text"
            value={config.color ?? ""}
            placeholder="#000000"
            onChange={(event) => updateTrack({ color: event.target.value || undefined })}
          />
        </div>
      </label>
      <label style={fieldStyle}>
        Height
        <input
          type="number"
          min={20}
          value={config.height}
          onChange={(event) => {
            const height = Number(event.target.value);
            if (!Number.isNaN(height)) updateTrack({ height: Math.max(20, height) });
          }}
        />
      </label>
      {displayOptions.length > 1 && (
        <label style={fieldStyle}>
          Display
          <select
            value={config.display}
            onChange={(event) => updateTrack({ display: event.target.value })}
          >
            {displayOptions.map((display) => (
              <option key={display} value={display}>
                {display}
              </option>
            ))}
          </select>
        </label>
      )}
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
