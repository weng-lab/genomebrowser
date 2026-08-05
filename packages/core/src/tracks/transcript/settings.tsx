import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { Transcript, TranscriptConfig } from "./types";

export function TranscriptSettings({
  track,
  updateTrack,
}: TrackSettingsProps<TranscriptConfig, Transcript>) {
  const { config } = track;
  return (
    <SettingsSection title="Transcript">
      <label style={{ display: "grid", gap: "4px" }}>
        Highlight gene
        <input
          type="text"
          value={config.geneName ?? ""}
          onChange={(event) =>
            updateTrack({ config: { geneName: event.target.value || undefined } })
          }
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Assembly
        <input
          type="text"
          value={config.assembly}
          onChange={(event) => updateTrack({ config: { assembly: event.target.value } })}
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
            if (Number.isInteger(version) && version > 0) updateTrack({ config: { version } });
          }}
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Canonical color
        <DraftColorInput
          value={config.canonicalColor}
          onCommit={(canonicalColor) => updateTrack({ config: { canonicalColor } })}
        />
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Highlight color
        <DraftColorInput
          value={config.highlightColor}
          onCommit={(highlightColor) => updateTrack({ config: { highlightColor } })}
        />
      </label>
    </SettingsSection>
  );
}
