import { useEffect } from "react";
import { useDraggableSettingsModal } from "./useDraggableSettingsModal";
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
    <dialog
      open
      aria-label={title}
      style={{ ...modalStyle, left: dragPosition.x, top: dragPosition.y }}
    >
      <div
        {...handleProps}
        style={{
          ...modalHeaderStyle,
          background: track.base.color || "#f5f5f5",
          color: getReadableTextColor(track.base.color || "#f5f5f5"),
          ...handleProps.style,
        }}
      >
        <div>{title}</div>
        <button
          type="button"
          onClick={closeSettings}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Close settings"
          style={closeButtonStyle}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div style={modalContentStyle}>{children}</div>
    </dialog>
  );
}

const modalStyle = {
  position: "fixed",
  zIndex: 10,
  minWidth: "280px",
  maxWidth: "420px",
  margin: 0,
  padding: 0,
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

const closeButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: "28px",
  height: "28px",
  margin: "-4px -4px -4px 0",
  padding: 0,
  border: "none",
  borderRadius: "4px",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
} as const;

const modalContentStyle = {
  display: "grid",
  gap: "12px",
  padding: "12px",
  maxHeight: "min(70vh, 720px)",
  overflowY: "auto",
} as const;
