import { useRef, useState } from "react";
import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { useSettingsStore, useTrackStore } from "../../browser/state/browserContextState";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { BigWigConfig } from "./types";

export function BigWigSettings() {
  return (
    <SettingsSection title="BigWig">
      <UrlField />
      <FillWithZeroField />
      <ShowClampIndicatorsField />
      <ClampIndicatorColorField />
      <YRangeFields />
    </SettingsSection>
  );
}

function UrlField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const url = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.url ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <label style={gridFieldStyle}>
      URL
      <input
        type="text"
        value={url}
        onChange={(event) => updateTrack(trackId, { config: { url: event.target.value } })}
      />
    </label>
  );
}

function FillWithZeroField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const fillWithZero = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.fillWithZero,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <label style={checkboxFieldStyle}>
      <input
        type="checkbox"
        checked={fillWithZero ?? false}
        onChange={(event) =>
          updateTrack(trackId, { config: { fillWithZero: event.target.checked } })
        }
      />
      Fill missing values with zero
    </label>
  );
}

function ShowClampIndicatorsField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const showClampIndicators = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.showClampIndicators,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <label style={checkboxFieldStyle}>
      <input
        type="checkbox"
        checked={showClampIndicators ?? true}
        onChange={(event) =>
          updateTrack(trackId, { config: { showClampIndicators: event.target.checked } })
        }
      />
      Show clamp indicators
    </label>
  );
}

function ClampIndicatorColorField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const color = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.clampIndicatorColor ?? "",
  );
  const showClampIndicators = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.showClampIndicators,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <label style={gridFieldStyle}>
      Clamp indicator color
      <DraftColorInput
        value={color}
        disabled={!(showClampIndicators ?? true)}
        onCommit={(clampIndicatorColor) =>
          updateTrack(trackId, { config: { clampIndicatorColor } })
        }
      />
    </label>
  );
}

function YRangeFields() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const minValue = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.yRange?.min,
  );
  const maxValue = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.yRange?.max,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const [rangeError, setRangeError] = useState<string>();
  const rangeErrorId = `${trackId}-y-range-error`;
  const updateYRange = () => {
    const min = parseRangeBound(minRef.current?.value ?? "");
    const max = parseRangeBound(maxRef.current?.value ?? "");

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
        : {
            ...(min !== undefined ? { min } : {}),
            ...(max !== undefined ? { max } : {}),
          };
    const result = updateTrack(trackId, { config: { yRange } });
    setRangeError(result.ok ? undefined : result.error);
  };

  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <div style={{ fontWeight: 600 }}>Y range</div>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          ref={minRef}
          aria-describedby={rangeError ? rangeErrorId : undefined}
          aria-invalid={rangeError !== undefined}
          aria-label="Minimum Y range"
          defaultValue={minValue ?? ""}
          inputMode="decimal"
          placeholder="min"
          type="text"
          onChange={updateYRange}
        />
        <input
          ref={maxRef}
          aria-describedby={rangeError ? rangeErrorId : undefined}
          aria-invalid={rangeError !== undefined}
          aria-label="Maximum Y range"
          defaultValue={maxValue ?? ""}
          inputMode="decimal"
          placeholder="max"
          type="text"
          onChange={updateYRange}
        />
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="button"
          onClick={() => {
            if (minRef.current) minRef.current.value = "";
            if (maxRef.current) maxRef.current.value = "";
            const result = updateTrack(trackId, { config: { yRange: undefined } });
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
  );
}

function parseRangeBound(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const gridFieldStyle = { display: "grid", gap: "4px" } as const;
const checkboxFieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
} as const;
