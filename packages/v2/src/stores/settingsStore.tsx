import { useEffect, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { useDraggableSettingsModal } from "../hooks/useDraggableSettingsModal";
import type { TrackConfigBase, TrackSettingsUpdate } from "../modules/types";

export type SettingsPosition = {
  x: number;
  y: number;
};

export type SettingsModalProps = {
  track: TrackConfigBase;
  title: string;
  position: SettingsPosition;
  closeSettings: () => void;
  children: ReactNode;
};

export type BaseSettingsProps<Config extends TrackConfigBase = TrackConfigBase> = {
  config: Config;
  displayOptions: string[];
  updateTrack: (partial: TrackSettingsUpdate<Config>) => void;
};

export type SettingsStoreInput = {
  modalComponent?: ComponentType<SettingsModalProps>;
  baseSettingsComponent?: ComponentType<BaseSettingsProps>;
};

export type SettingsStore = {
  open: boolean;
  trackId?: string;
  position: SettingsPosition;
  modalComponent: ComponentType<SettingsModalProps>;
  baseSettingsComponent: ComponentType<BaseSettingsProps>;
  openSettings: (trackId: string, position: SettingsPosition) => void;
  closeSettings: () => void;
  setModalComponent: (component: ComponentType<SettingsModalProps>) => void;
  setBaseSettingsComponent: (component: ComponentType<BaseSettingsProps>) => void;
};

export type SettingsStoreInstance = UseBoundStore<StoreApi<SettingsStore>>;

export function createSettingsStore(input: SettingsStoreInput = {}): SettingsStoreInstance {
  return create<SettingsStore>((set) => ({
    open: false,
    trackId: undefined,
    position: { x: 0, y: 0 },
    modalComponent: input.modalComponent ?? DefaultSettingsModal,
    baseSettingsComponent: input.baseSettingsComponent ?? DefaultBaseSettings,
    openSettings: (trackId, position) => set({ open: true, trackId, position }),
    closeSettings: () => set({ open: false }),
    setModalComponent: (component) => set({ modalComponent: component }),
    setBaseSettingsComponent: (component) => set({ baseSettingsComponent: component }),
  }));
}

export function DefaultSettingsModal({
  track,
  title,
  position,
  closeSettings,
  children,
}: SettingsModalProps) {
  const { position: dragPosition, handleProps } = useDraggableSettingsModal(position);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSettings]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={title}
      style={{
        position: "fixed",
        left: dragPosition.x,
        top: dragPosition.y,
        zIndex: 10,
        minWidth: "280px",
        maxWidth: "420px",
        background: "#ffffff",
        border: "1px solid #cccccc",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
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
          padding: "10px 12px",
          background: track.color || "#f5f5f5",
          color: getReadableTextColor(track.color || "#f5f5f5"),
          fontWeight: 700,
        }}
      >
        <div>{title}</div>
        <button
          type="button"
          onClick={closeSettings}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Close settings"
          style={{
            border: "none",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>
      <div style={{ display: "grid", gap: "12px", padding: "12px" }}>{children}</div>
    </div>
  );
}

export function DefaultBaseSettings({ config, displayOptions, updateTrack }: BaseSettingsProps) {
  return (
    <SettingsSection title="Track">
      <label style={fieldStyle}>
        Title
        <input
          type="text"
          value={config.title}
          onChange={(event) => updateTrack({ title: event.target.value })}
        />
      </label>
      <label style={fieldStyle}>
        Color
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="color"
            value={isHexColor(config.color) ? config.color : "#000000"}
            onChange={(event) => updateTrack({ color: event.target.value })}
          />
          <input
            type="text"
            value={config.color ?? ""}
            placeholder="#000000"
            onChange={(event) => updateTrack({ color: event.target.value || undefined })}
          />
        </div>
      </label>
      <label style={fieldStyle}>
        Height
        <input
          type="number"
          min={20}
          value={config.height}
          onChange={(event) => {
            const height = Number(event.target.value);
            if (!Number.isNaN(height)) updateTrack({ height: Math.max(20, height) });
          }}
        />
      </label>
      {displayOptions.length > 1 && (
        <label style={fieldStyle}>
          Display
          <select
            value={config.display}
            onChange={(event) => updateTrack({ display: event.target.value })}
          >
            {displayOptions.map((display) => (
              <option key={display} value={display}>
                {display}
              </option>
            ))}
          </select>
        </label>
      )}
    </SettingsSection>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: "8px" }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {children}
    </section>
  );
}

const fieldStyle = {
  display: "grid",
  gap: "4px",
} satisfies CSSProperties;

function isHexColor(value: string | undefined) {
  return value ? /^#[0-9a-fA-F]{6}$/.test(value) : false;
}

function getReadableTextColor(background: string) {
  if (!isHexColor(background)) return "#000000";
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 186 ? "#000000" : "#ffffff";
}
