import type { CSSProperties } from "react";
import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { useSettingsStore, useTrackStore } from "../../browser/state/browserContextState";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { CaveConfig } from "./types";

export function CaveSettings() {
  return (
    <SettingsSection title="CAVE">
      <CaveColorField configKey="topColor" label="Top color" />
      <CaveColorField configKey="bottomColor" label="Bottom color" />
    </SettingsSection>
  );
}

function CaveColorField({
  configKey,
  label,
}: {
  configKey: "topColor" | "bottomColor";
  label: string;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const color = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as CaveConfig | undefined)?.[configKey] ?? "",
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

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
