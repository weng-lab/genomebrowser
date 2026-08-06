import { useEffect, useId } from "react";
import { useTrackStore } from "../state/browserContextState";
import {
  SETTINGS_MODAL_VIEWPORT_INSET,
  useDraggableSettingsModal,
  type DraggableSettingsModalResult,
} from "./useDraggableSettingsModal";
import { getReadableTextColor } from "./settingsColor";
import type { SettingsModalProps } from "./types";

export function DefaultSettingsModal({
  trackId,
  position,
  closeSettings,
  children,
}: SettingsModalProps) {
  const { position: dragPosition, modalRef, handleProps } = useDraggableSettingsModal(position);
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSettings]);

  return (
    <dialog
      ref={modalRef}
      open
      aria-labelledby={titleId}
      style={{ ...modalStyle, left: dragPosition.x, top: dragPosition.y }}
    >
      <SettingsModalHeader
        closeSettings={closeSettings}
        handleProps={handleProps}
        titleId={titleId}
        trackId={trackId}
      />
      <div style={modalContentStyle}>{children}</div>
    </dialog>
  );
}

function SettingsModalHeader({
  closeSettings,
  handleProps,
  titleId,
  trackId,
}: {
  closeSettings: () => void;
  handleProps: DraggableSettingsModalResult["handleProps"];
  titleId: string;
  trackId: string;
}) {
  const title = useTrackStore((state) => state.getTrack(trackId)?.base.title);
  const color = useTrackStore((state) => state.getTrack(trackId)?.base.color);
  if (!title || !color) return null;

  return (
    <div
      {...handleProps}
      style={{
        ...modalHeaderStyle,
        background: color,
        color: getReadableTextColor(color),
        ...handleProps.style,
      }}
    >
      <div id={titleId}>Configure {title}</div>
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
  );
}

const modalStyle = {
  position: "fixed",
  zIndex: 10,
  boxSizing: "border-box",
  width: "550px",
  maxWidth: `calc(100vw - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px)`,
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
