import type { CSSProperties } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { CaveConfig } from "./types";

export function CaveSettings({ config, updateConfig }: TrackSettingsProps<CaveConfig>) {
  return (
    <SettingsSection title="CAVE">
      <label style={fieldStyle}>
        Top color
        <input
          type="text"
          value={config.topColor ?? ""}
          placeholder="Derived from bottom color"
          onChange={(event) => updateConfig({ topColor: event.target.value || undefined })}
        />
      </label>
      <label style={fieldStyle}>
        Bottom color
        <input
          type="text"
          value={config.bottomColor ?? ""}
          placeholder="Track color"
          onChange={(event) => updateConfig({ bottomColor: event.target.value || undefined })}
        />
      </label>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
