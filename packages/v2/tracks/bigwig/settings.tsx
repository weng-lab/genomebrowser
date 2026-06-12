import { useRef, useState } from "react";
import type { TrackSettingsProps } from "../../src/modules/types";
import { SettingsSection } from "../../src/settings/SettingsSection";
import type { BigWigConfig } from "./types";

export function BigWigSettings({ config, updateTrack }: TrackSettingsProps<BigWigConfig>) {
  const [min, setMin] = useState(config.yRange?.min?.toString() ?? "");
  const [max, setMax] = useState(config.yRange?.max?.toString() ?? "");
  const previousYRange = useRef(config.yRange);
  const minNumber = Number(min);
  const maxNumber = Number(max);
  const invalidRange =
    min !== "" &&
    max !== "" &&
    (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber) || minNumber >= maxNumber);

  if (config.yRange !== previousYRange.current) {
    previousYRange.current = config.yRange;
    setMin(config.yRange?.min?.toString() ?? "");
    setMax(config.yRange?.max?.toString() ?? "");
  }

  return (
    <SettingsSection title="BigWig">
      <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="checkbox"
          checked={config.fillWithZero ?? false}
          onChange={(event) => updateTrack({ fillWithZero: event.target.checked })}
        />
        Fill missing values with zero
      </label>
      <div style={{ display: "grid", gap: "6px" }}>
        <div style={{ fontWeight: 600 }}>Y range</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="number"
            step="any"
            aria-label="Minimum Y range"
            placeholder="min"
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
          <input
            type="number"
            step="any"
            aria-label="Maximum Y range"
            placeholder="max"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
        </div>
        {invalidRange && <div style={{ color: "#b00020" }}>Min must be less than max.</div>}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            disabled={invalidRange || min === "" || max === ""}
            onClick={() => updateTrack({ yRange: { min: minNumber, max: maxNumber } })}
          >
            Apply range
          </button>
          <button type="button" onClick={() => updateTrack({ yRange: undefined })}>
            Auto scale
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
