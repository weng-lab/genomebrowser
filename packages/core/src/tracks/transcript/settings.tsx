import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { useSettingsStore, useTrackStore } from "../../browser/state/browserContextState";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TranscriptConfig } from "./types";

export function TranscriptSettings() {
  return (
    <SettingsSection title="Transcript">
      <TextConfigField configKey="geneName" label="Highlight gene" />
      <TextConfigField configKey="assembly" label="Assembly" />
      <VersionField />
      <ColorConfigField configKey="canonicalColor" label="Canonical color" />
      <ColorConfigField configKey="highlightColor" label="Highlight color" />
    </SettingsSection>
  );
}

function TextConfigField({
  configKey,
  label,
}: {
  configKey: "assembly" | "geneName";
  label: string;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const value = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.[configKey],
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <label style={fieldStyle}>
      {label}
      <input
        type="text"
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          updateTrack(trackId, {
            config: { [configKey]: configKey === "geneName" ? nextValue || undefined : nextValue },
          });
        }}
      />
    </label>
  );
}

function VersionField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const version = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.version ?? 1,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <label style={fieldStyle}>
      Version
      <input
        type="number"
        min={1}
        step={1}
        value={version}
        onChange={(event) => {
          const nextVersion = Number(event.target.value);
          if (Number.isInteger(nextVersion) && nextVersion > 0) {
            updateTrack(trackId, { config: { version: nextVersion } });
          }
        }}
      />
    </label>
  );
}

function ColorConfigField({
  configKey,
  label,
}: {
  configKey: "canonicalColor" | "highlightColor";
  label: string;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const color = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.[configKey] ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <label style={fieldStyle}>
      {label}
      <DraftColorInput
        value={color}
        onCommit={(value) => updateTrack(trackId, { config: { [configKey]: value } })}
      />
    </label>
  );
}

const fieldStyle = { display: "grid", gap: "4px" } as const;
