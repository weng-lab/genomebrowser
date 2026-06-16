import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigBedConfig } from "./types";

export function BigBedSettings({ config, updateTrack }: TrackSettingsProps<BigBedConfig>) {
  const [url, setUrl] = useState(config.url);
  const previousUrl = useRef(config.url);

  if (config.url !== previousUrl.current) {
    previousUrl.current = config.url;
    setUrl(config.url);
  }

  const trimmedUrl = url.trim();
  const hasUrlChange = trimmedUrl !== config.url;

  return (
    <SettingsSection title="BigBed">
      <label style={fieldStyle}>
        URL
        <input type="text" value={url} onChange={(event) => setUrl(event.target.value)} />
      </label>
      <button
        type="button"
        disabled={trimmedUrl === "" || !hasUrlChange}
        onClick={() => updateTrack({ url: trimmedUrl })}
      >
        Apply URL
      </button>
      <div style={fieldStyle}>
        <div>Schema</div>
        <div>{config.schema ? "Custom schema attached" : "No custom schema"}</div>
        {config.schema && (
          <button type="button" onClick={() => updateTrack({ schema: undefined })}>
            Clear schema
          </button>
        )}
      </div>
    </SettingsSection>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;
