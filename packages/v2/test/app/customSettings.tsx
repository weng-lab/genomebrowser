import type { CSSProperties } from "react";
import {
  bigWigModule,
  createSettingsStore,
  useDraggableSettingsModal,
  type BaseSettingsProps,
  type BigWigConfig,
  type SettingsModalProps,
  type TrackSettingsProps,
} from "../../src/lib";

export const demoSettingsStore = createSettingsStore({
  modalComponent: DemoSettingsModal,
  baseSettingsComponent: DemoBaseSettings,
});

export const demoBigWigModule = {
  ...bigWigModule,
  settingsComponent: DemoBigWigSettings,
};

function DemoSettingsModal({
  track,
  title,
  position,
  closeSettings,
  children,
}: SettingsModalProps) {
  const { position: dragPosition, handleProps } = useDraggableSettingsModal({
    x: position.x + 18,
    y: position.y + 18,
  });

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: "fixed",
        left: dragPosition.x,
        top: dragPosition.y,
        zIndex: 20,
        width: "380px",
        overflow: "hidden",
        border: "4px solid #111827",
        borderRadius: "22px",
        background:
          "linear-gradient(145deg, #fff7ed 0%, #fef3c7 45%, #ecfeff 100%)",
        boxShadow: "14px 14px 0 #111827",
        color: "#111827",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        {...handleProps}
        style={{
          ...handleProps.style,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "14px 16px",
          background: "#111827",
          color: "#fef3c7",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Custom Store Modal
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{title}</div>
        </div>
        <button
          type="button"
          onClick={closeSettings}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            width: "34px",
            height: "34px",
            border: "2px solid #fef3c7",
            borderRadius: "999px",
            background: track.color || "#f97316",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          X
        </button>
      </div>
      <div style={{ display: "grid", gap: "14px", padding: "16px" }}>
        {children}
      </div>
    </div>
  );
}

function DemoBigWigSettings({
  config,
  updateTrack,
}: TrackSettingsProps<BigWigConfig>) {
  const yRange = config.yRange;
  return (
    <section
      style={{
        display: "grid",
        gap: "10px",
        padding: "14px",
        border: "3px dashed #7c3aed",
        borderRadius: "16px",
        background: "#f5f3ff",
        color: "#3b0764",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 900 }}>
        Purple BigWig Override
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="checkbox"
          checked={config.fillWithZero ?? false}
          onChange={(event) =>
            updateTrack({ fillWithZero: event.target.checked })
          }
        />
        Fill gaps with zero
      </label>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => updateTrack({ yRange: { min: 0, max: 10 } })}
          style={purpleButtonStyle}
        >
          Range 0-10
        </button>
        <button
          type="button"
          onClick={() => updateTrack({ yRange: { min: -2, max: 2 } })}
          style={purpleButtonStyle}
        >
          Range -2-2
        </button>
        <button
          type="button"
          onClick={() => updateTrack({ yRange: undefined })}
          style={purpleButtonStyle}
        >
          Auto range
        </button>
      </div>
      <div style={{ fontSize: "12px", fontWeight: 700 }}>
        Current range: {yRange ? `${yRange.min} to ${yRange.max}` : "auto"}
      </div>
    </section>
  );
}

function DemoBaseSettings({
  config,
  displayOptions,
  updateTrack,
}: BaseSettingsProps) {
  return (
    <section
      style={{
        display: "grid",
        gap: "12px",
        padding: "16px",
        border: "4px dotted #ef4444",
        borderRadius: "18px",
        background:
          "repeating-linear-gradient(135deg, #fef08a 0 18px, #fecaca 18px 36px)",
        color: "#111827",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        Chaotic Base Controls
      </div>
      <label style={{ display: "grid", gap: "6px" }}>
        Rename this track dramatically
        <input
          type="text"
          value={config.title}
          onChange={(event) => updateTrack({ title: event.target.value })}
          style={goofyInputStyle}
        />
      </label>
      <div style={{ display: "grid", gap: "6px" }}>
        <div style={{ fontWeight: 800 }}>Choose an aggressively loud color</div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="color"
            value={isHexColor(config.color) ? config.color : "#ff00aa"}
            onChange={(event) => updateTrack({ color: event.target.value })}
            style={{ width: "64px", height: "48px", cursor: "pointer" }}
          />
          <input
            type="text"
            value={config.color ?? ""}
            placeholder="#ff00aa"
            onChange={(event) =>
              updateTrack({ color: event.target.value || undefined })
            }
            style={goofyInputStyle}
          />
          <div
            style={{
              padding: "8px 12px",
              border: "3px solid #111827",
              borderRadius: "999px",
              background: config.color || "#ffffff",
              color: isHexColor(config.color)
                ? readableTextColor(config.color!)
                : "#111827",
              fontWeight: 900,
            }}
          >
            Swatch Energy
          </div>
        </div>
      </div>
      <label style={{ display: "grid", gap: "6px" }}>
        Height but make it silly
        <input
          type="number"
          min={20}
          value={config.height}
          onChange={(event) => {
            const height = Number(event.target.value);
            if (!Number.isNaN(height))
              updateTrack({ height: Math.max(20, height) });
          }}
          style={goofyInputStyle}
        />
      </label>
      {displayOptions.length > 1 && (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontWeight: 800 }}>Display Mode Button Circus</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {displayOptions.map((display) => {
              const selected = display === config.display;
              return (
                <button
                  key={display}
                  type="button"
                  onClick={() => updateTrack({ display })}
                  style={{
                    border: "3px solid #111827",
                    borderRadius: "999px",
                    background: selected ? "#111827" : "#ffffff",
                    color: selected ? "#fde68a" : "#111827",
                    cursor: "pointer",
                    fontWeight: 900,
                    padding: "10px 16px",
                    transform: selected
                      ? "rotate(-2deg) scale(1.06)"
                      : "rotate(2deg)",
                  }}
                >
                  {selected ? `>> ${display} <<` : display}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const purpleButtonStyle = {
  border: "2px solid #4c1d95",
  borderRadius: "999px",
  background: "#7c3aed",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
  padding: "8px 12px",
} satisfies CSSProperties;

const goofyInputStyle = {
  border: "3px solid #111827",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#111827",
  fontSize: "16px",
  fontWeight: 700,
  padding: "10px 12px",
} satisfies CSSProperties;

function isHexColor(value: string | undefined) {
  return value ? /^#[0-9a-fA-F]{6}$/.test(value) : false;
}

function readableTextColor(background: string) {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 186
    ? "#111827"
    : "#ffffff";
}
