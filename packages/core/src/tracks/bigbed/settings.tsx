import type { CSSProperties } from "react";
import { useSettingsStore, useTrackStore } from "../../browser/state/browserContextState";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { BigBedConfig } from "./types";

export function BigBedSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const url = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigBedConfig | undefined)?.url ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <SettingsSection title="BigBed">
      <label style={fieldStyle}>
        URL
        <input
          type="text"
          value={url}
          onChange={(event) => updateTrack(trackId, { config: { url: event.target.value } })}
        />
      </label>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
