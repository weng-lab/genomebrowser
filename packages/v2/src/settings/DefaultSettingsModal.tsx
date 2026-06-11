import { useEffect } from "react";
import { useDraggableSettingsModal } from "../hooks/useDraggableSettingsModal";
import { getReadableTextColor } from "./settingsColor";
import type { SettingsModalProps } from "./types";

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
      style={{ ...modalStyle, left: dragPosition.x, top: dragPosition.y }}
    >
      <div
        {...handleProps}
        style={{
          ...modalHeaderStyle,
          background: track.color || "#f5f5f5",
          color: getReadableTextColor(track.color || "#f5f5f5"),
          ...handleProps.style,
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

const modalStyle = {
  position: "fixed",
  zIndex: 10,
  minWidth: "280px",
  maxWidth: "420px",
  background: "#ffffff",
  border: "1px solid #cccccc",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
  fontFamily: "system-ui, sans-serif",
  fontSize: "14px",
} as const;

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 12px",
  fontWeight: 700,
} as const;
