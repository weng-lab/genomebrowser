import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { Transcript, TranscriptConfig } from "./types";

type TranscriptSettingsProps = TrackSettingsProps<TranscriptConfig, Transcript>;

export function TranscriptSettings({ track, updateTrack }: TranscriptSettingsProps) {
  const { config } = track;
  return (
    <SettingsSection title="Transcript">
      <TextConfigField
        configKey="geneName"
        label="Highlight gene"
        updateTrack={updateTrack}
        value={config.geneName}
      />
      <TextConfigField
        configKey="assembly"
        label="Assembly"
        updateTrack={updateTrack}
        value={config.assembly}
      />
      <VersionField updateTrack={updateTrack} version={config.version} />
      <ColorConfigField
        color={config.canonicalColor}
        configKey="canonicalColor"
        label="Canonical color"
        updateTrack={updateTrack}
      />
      <ColorConfigField
        color={config.highlightColor}
        configKey="highlightColor"
        label="Highlight color"
        updateTrack={updateTrack}
      />
    </SettingsSection>
  );
}

function TextConfigField({
  configKey,
  label,
  updateTrack,
  value,
}: {
  configKey: "assembly" | "geneName";
  label: string;
  updateTrack: TranscriptSettingsProps["updateTrack"];
  value: string | undefined;
}) {
  return (
    <label style={fieldStyle}>
      {label}
      <input
        type="text"
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          updateTrack({
            config: { [configKey]: configKey === "geneName" ? nextValue || undefined : nextValue },
          });
        }}
      />
    </label>
  );
}

function VersionField({
  updateTrack,
  version,
}: {
  updateTrack: TranscriptSettingsProps["updateTrack"];
  version: number;
}) {
  return (
    <label style={fieldStyle}>
      Version
      <input
        type="number"
        min={1}
        step={1}
        value={version}
        onChange={(event) => {
          const nextVersion = event.currentTarget.valueAsNumber;
          if (Number.isInteger(nextVersion) && nextVersion > 0) {
            updateTrack({ config: { version: nextVersion } });
          }
        }}
      />
    </label>
  );
}

function ColorConfigField({
  color,
  configKey,
  label,
  updateTrack,
}: {
  color: string;
  configKey: "canonicalColor" | "highlightColor";
  label: string;
  updateTrack: TranscriptSettingsProps["updateTrack"];
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

const fieldStyle = { display: "grid", gap: "4px" } as const;
