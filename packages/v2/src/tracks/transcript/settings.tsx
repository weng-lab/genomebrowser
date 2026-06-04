import type { TrackSettingsProps } from "../../modules/types";
import { SettingsSection } from "../../stores/settingsStore";
import type { TranscriptConfig } from "./types";

export function TranscriptSettings({ config, updateTrack }: TrackSettingsProps<TranscriptConfig>) {
  return (
    <SettingsSection title="Transcript">
      <label style={{ display: "grid", gap: "4px" }}>
        Highlight gene
        <input
          type="text"
          value={config.geneName ?? ""}
          onChange={(event) => updateTrack({ geneName: event.target.value || undefined })}
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Assembly
        <input
          type="text"
          value={config.assembly}
          onChange={(event) => updateTrack({ assembly: event.target.value })}
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Version
        <input
          type="number"
          min={1}
          step={1}
          value={config.version}
          onChange={(event) => {
            const version = Number(event.target.value);
            if (Number.isInteger(version) && version > 0) updateTrack({ version });
          }}
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Canonical color
        <input
          type="text"
          value={config.canonicalColor ?? ""}
          placeholder="#000000"
          onChange={(event) => updateTrack({ canonicalColor: event.target.value || undefined })}
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Highlight color
        <input
          type="text"
          value={config.highlightColor ?? ""}
          placeholder="#000000"
          onChange={(event) => updateTrack({ highlightColor: event.target.value || undefined })}
        />
      </label>
    </SettingsSection>
  );
}
