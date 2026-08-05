import { useRef, useState } from "react";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigWigConfig } from "./types";

export function BigWigSettings({ id, config, updateConfig }: TrackSettingsProps<BigWigConfig>) {
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const [rangeError, setRangeError] = useState<string>();
  const rangeErrorId = `${id}-y-range-error`;
  const updateYRange = () => {
    const minValue = minRef.current?.value ?? "";
    const maxValue = maxRef.current?.value ?? "";
    const min = parseRangeBound(minValue);
    const max = parseRangeBound(maxValue);

    if (min === null || max === null) {
      setRangeError("Enter a finite number.");
      return;
    }
    if (min !== undefined && max !== undefined && min >= max) {
      setRangeError("Minimum must be less than maximum.");
      return;
    }

    const yRange =
      min === undefined && max === undefined
        ? undefined
        : { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
    const result = updateConfig({ yRange });
    setRangeError(result.ok ? undefined : result.error);
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
            type="text"
            inputMode="decimal"
            aria-label="Minimum Y range"
            aria-describedby={rangeError ? rangeErrorId : undefined}
            aria-invalid={rangeError !== undefined}
            placeholder="min"
            defaultValue={config.yRange?.min ?? ""}
            ref={minRef}
            onChange={updateYRange}
          />
          <input
            type="text"
            inputMode="decimal"
            aria-label="Maximum Y range"
            aria-describedby={rangeError ? rangeErrorId : undefined}
            aria-invalid={rangeError !== undefined}
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
              const result = updateConfig({ yRange: undefined });
              setRangeError(result.ok ? undefined : result.error);
            }}
          >
            Auto scale
          </button>
        </div>
        {rangeError && (
          <div id={rangeErrorId} role="alert" style={{ color: "#b00020" }}>
            {rangeError}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

function parseRangeBound(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
