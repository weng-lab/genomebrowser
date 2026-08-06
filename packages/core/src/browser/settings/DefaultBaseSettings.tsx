import type { CSSProperties } from "react";
import { useState } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import { useSettingsStore, useTrackStore } from "../state/browserContextState";
import { useRegistry } from "../state/useRegistry";
import { DraftColorInput } from "./DraftColorInput";
import { isHexColor } from "./settingsColor";

export function DefaultBaseSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const trackType = useTrackStore((state) => state.getTrack(trackId)?.type);
  const registry = useRegistry();
  const displayOptions = trackType ? Object.keys(registry.get(trackType).render) : [];

  return (
    <SettingsSection title="Track">
      <TitleField />
      <ColorField />
      <HeightField />
      {displayOptions.length > 1 && <DisplayField displayOptions={displayOptions} />}
    </SettingsSection>
  );
}

function TitleField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const title = useTrackStore((state) => state.getTrack(trackId)?.base.title ?? "");
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const [error, setError] = useState<string>();

  return (
    <label style={fieldStyle}>
      Title
      <input
        type="text"
        value={title}
        onChange={(event) => {
          const result = updateTrack(trackId, { base: { title: event.target.value } });
          setError(result.ok ? undefined : result.error);
        }}
      />
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function ColorField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const color = useTrackStore((state) => state.getTrack(trackId)?.base.color ?? "");
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <label style={fieldStyle}>
      Color
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="color"
          value={isHexColor(color) ? color : "#000000"}
          onChange={(event) => updateTrack(trackId, { base: { color: event.target.value } })}
        />
        <DraftColorInput
          ariaLabel="Color hexadecimal value"
          value={color}
          onCommit={(nextColor) => updateTrack(trackId, { base: { color: nextColor } })}
        />
      </div>
    </label>
  );
}

function HeightField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const height = useTrackStore((state) => state.getTrack(trackId)?.base.height ?? 20);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const [error, setError] = useState<string>();

  return (
    <label style={fieldStyle}>
      Height
      <input
        type="number"
        min={20}
        value={height}
        onChange={(event) => {
          const nextHeight = Number(event.target.value);
          if (Number.isNaN(nextHeight)) return;
          const result = updateTrack(trackId, { base: { height: Math.max(20, nextHeight) } });
          setError(result.ok ? undefined : result.error);
        }}
      />
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function DisplayField({ displayOptions }: { displayOptions: readonly string[] }) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const display = useTrackStore((state) => state.getTrack(trackId)?.base.display ?? "");
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const [error, setError] = useState<string>();

  return (
    <label style={fieldStyle}>
      Display
      <select
        value={display}
        onChange={(event) => {
          const result = updateTrack(trackId, { base: { display: event.target.value } });
          setError(result.ok ? undefined : result.error);
        }}
      >
        {displayOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function FieldError({ children }: { children: string }) {
  return <div style={errorStyle}>{children}</div>;
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;

const errorStyle = {
  color: "#b00020",
  fontSize: "12px",
} satisfies CSSProperties;
