import { useRef, useState } from "react";
import { DraftColorInput } from "../../browser/settings/DraftColorInput";
import { SettingsSection } from "../../modules/runtime/SettingsSection";
import type { TrackSettingsProps } from "../../modules/types";
import type { BigWigConfig, RenderedBigWigPoint } from "./types";

type BigWigSettingsProps = TrackSettingsProps<BigWigConfig, RenderedBigWigPoint>;

export function BigWigSettings({ track, updateTrack }: BigWigSettingsProps) {
  const { config } = track;
  return (
    <SettingsSection title="BigWig">
      <UrlField updateTrack={updateTrack} url={config.url} />
      <FillWithZeroField fillWithZero={config.fillWithZero} updateTrack={updateTrack} />
      <ShowClampIndicatorsField
        showClampIndicators={config.showClampIndicators}
        updateTrack={updateTrack}
      />
      <ClampIndicatorColorField
        color={config.clampIndicatorColor}
        showClampIndicators={config.showClampIndicators}
        updateTrack={updateTrack}
      />
      <YRangeFields id={track.base.id} updateTrack={updateTrack} yRange={config.yRange} />
    </SettingsSection>
  );
}

function UrlField({
  updateTrack,
  url,
}: {
  updateTrack: BigWigSettingsProps["updateTrack"];
  url: string;
}) {
  return (
    <label style={gridFieldStyle}>
      URL
      <input
        type="text"
        value={url}
        onChange={(event) => updateTrack({ config: { url: event.target.value } })}
      />
    </label>
  );
}

function FillWithZeroField({
  fillWithZero,
  updateTrack,
}: {
  fillWithZero: boolean;
  updateTrack: BigWigSettingsProps["updateTrack"];
}) {
  return (
    <label style={checkboxFieldStyle}>
      <input
        type="checkbox"
        checked={fillWithZero ?? false}
        onChange={(event) => updateTrack({ config: { fillWithZero: event.target.checked } })}
      />
      Fill missing values with zero
    </label>
  );
}

function ShowClampIndicatorsField({
  showClampIndicators,
  updateTrack,
}: {
  showClampIndicators: boolean;
  updateTrack: BigWigSettingsProps["updateTrack"];
}) {
  return (
    <label style={checkboxFieldStyle}>
      <input
        type="checkbox"
        checked={showClampIndicators ?? true}
        onChange={(event) => updateTrack({ config: { showClampIndicators: event.target.checked } })}
      />
      Show clamp indicators
    </label>
  );
}

function ClampIndicatorColorField({
  color,
  showClampIndicators,
  updateTrack,
}: {
  color: string;
  showClampIndicators: boolean;
  updateTrack: BigWigSettingsProps["updateTrack"];
}) {
  return (
    <label style={gridFieldStyle}>
      Clamp indicator color
      <DraftColorInput
        value={color}
        disabled={!(showClampIndicators ?? true)}
        onCommit={(clampIndicatorColor) => updateTrack({ config: { clampIndicatorColor } })}
      />
    </label>
  );
}

function YRangeFields({
  id,
  updateTrack,
  yRange,
}: {
  id: string;
  updateTrack: BigWigSettingsProps["updateTrack"];
  yRange: BigWigConfig["yRange"];
}) {
  const minValue = yRange?.min;
  const maxValue = yRange?.max;
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const [rangeError, setRangeError] = useState<string>();
  const rangeErrorId = `${id}-y-range-error`;
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
    const result = updateTrack({ config: { yRange } });
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
            const result = updateTrack({ config: { yRange: undefined } });
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
