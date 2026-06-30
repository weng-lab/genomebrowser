import type { CSSProperties } from "react";
import { useState } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackBase } from "../../modules/types";
import { isHexColor } from "./settingsColor";
import type { BaseSettingsProps } from "./types";

export function DefaultBaseSettings({ base, displayOptions, updateBase }: BaseSettingsProps) {
  const [error, setError] = useState<string | null>(null);
  const applyUpdate = (partial: Partial<TrackBase>) => {
    const result = updateBase(partial);
    setError(result.ok ? null : result.error);
  };

  return (
    <SettingsSection title="Track">
      {error && <div style={errorStyle}>{error}</div>}
      <label style={fieldStyle}>
        Title
        <input
          type="text"
          value={base.title}
          onChange={(event) => applyUpdate({ title: event.target.value })}
        />
      </label>
      <label style={fieldStyle}>
        Color
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="color"
            value={isHexColor(base.color) ? base.color : "#000000"}
            onChange={(event) => applyUpdate({ color: event.target.value })}
          />
          <input
            type="text"
            value={base.color ?? ""}
            placeholder="#000000"
            onChange={(event) => applyUpdate({ color: event.target.value || undefined })}
          />
        </div>
      </label>
      <label style={fieldStyle}>
        Height
        <input
          type="number"
          min={20}
          value={base.height}
          onChange={(event) => {
            const height = Number(event.target.value);
            if (!Number.isNaN(height)) applyUpdate({ height: Math.max(20, height) });
          }}
        />
      </label>
      {displayOptions.length > 1 && (
        <label style={fieldStyle}>
          Display
          <select
            value={base.display}
            onChange={(event) => applyUpdate({ display: event.target.value })}
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

const errorStyle = {
  color: "#b00020",
  fontSize: "12px",
} satisfies CSSProperties;
