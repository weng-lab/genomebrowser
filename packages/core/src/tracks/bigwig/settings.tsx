import { useRef } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigWigConfig } from "./types";

export function BigWigSettings({ config, updateConfig }: TrackSettingsProps<BigWigConfig>) {
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const updateYRange = () => {
    const minValue = minRef.current?.value ?? "";
    const maxValue = maxRef.current?.value ?? "";
    if (minValue === "" || maxValue === "") return;

    const min = Number(minValue);
    const max = Number(maxValue);
    if (Number.isFinite(min) && Number.isFinite(max) && min < max)
      updateConfig({ yRange: { min, max } });
  };

  return (
    <SettingsSection title="BigWig">
      <label style={{ display: "grid", gap: "4px" }}>
        URL
        <input
          type="text"
          value={config.url}
          onChange={(event) => updateConfig({ url: event.target.value })}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="checkbox"
          checked={config.fillWithZero ?? false}
          onChange={(event) => updateConfig({ fillWithZero: event.target.checked })}
        />
        Fill missing values with zero
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="checkbox"
          checked={config.showClampIndicators ?? true}
          onChange={(event) => updateConfig({ showClampIndicators: event.target.checked })}
        />
        Show clamp indicators
      </label>
      <label style={{ display: "grid", gap: "4px" }}>
        Clamp indicator color
        <input
          type="text"
          value={config.clampIndicatorColor ?? "#ff0000"}
          disabled={!(config.showClampIndicators ?? true)}
          onChange={(event) => updateConfig({ clampIndicatorColor: event.target.value })}
        />
      </label>
      <div style={{ display: "grid", gap: "6px" }}>
        <div style={{ fontWeight: 600 }}>Y range</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="number"
            step="any"
            aria-label="Minimum Y range"
            placeholder="min"
            defaultValue={config.yRange?.min ?? ""}
            ref={minRef}
            onChange={updateYRange}
          />
          <input
            type="number"
            step="any"
            aria-label="Maximum Y range"
            placeholder="max"
            defaultValue={config.yRange?.max ?? ""}
            ref={maxRef}
            onChange={updateYRange}
          />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => {
              if (minRef.current) minRef.current.value = "";
              if (maxRef.current) maxRef.current.value = "";
              updateConfig({ yRange: undefined });
            }}
          >
            Auto scale
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
