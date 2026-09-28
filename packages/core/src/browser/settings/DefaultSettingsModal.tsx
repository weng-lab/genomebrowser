import { useEffect, useId } from "react";
import { useGenomeBrowser, useTrackMutationGate } from "../state/browserContextState";
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
  const { useTrackStore } = useGenomeBrowser();
  const title = useTrackStore((state) => state.getTrack(trackId)?.base.title);
  const color = useTrackStore((state) => state.getTrack(trackId)?.base.color);
  const isChild = useTrackStore((state) => !state.order.includes(trackId));
  const isPinned = useTrackStore((state) => state.pinnedTrackIds.includes(trackId));
  const setPinnedTrackIds = useTrackStore((state) => state.setPinnedTrackIds);
  const { isInteractionBlocked, runTrackMutation } = useTrackMutationGate();
  if (!title || !color) return null;

  const togglePin = () => {
    runTrackMutation(() => {
      const { pinnedTrackIds } = useTrackStore.getState();
      return setPinnedTrackIds(
        pinnedTrackIds.includes(trackId)
          ? pinnedTrackIds.filter((id) => id !== trackId)
          : [...pinnedTrackIds, trackId],
      );
    });
  };
  const pinLabel = isPinned ? "Unpin track" : "Pin track";

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
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={togglePin}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={pinLabel}
          aria-pressed={isPinned}
          title={pinLabel}
          disabled={isInteractionBlocked || isChild}
          style={{
            ...headerButtonStyle,
            cursor: isInteractionBlocked ? "default" : "pointer",
            opacity: isInteractionBlocked ? 0.5 : 1,
          }}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M9 3h6l-1 7 4 4v2H6v-2l4-4z" fill={isPinned ? "currentColor" : "none"} />
            <path d="M12 16v5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={closeSettings}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Close settings"
          style={headerButtonStyle}
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
    </div>
  );
}

const modalStyle = {
  position: "fixed",
  zIndex: 10,
  boxSizing: "border-box",
  width: "550px",
  maxWidth: `calc(100vw - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px)`,
  maxHeight: `min(550px, calc(100vw - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px), calc(100dvh - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px))`,
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
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

const headerButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: "28px",
  height: "28px",
  margin: "-4px 0",
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
  minHeight: 0,
  overflowY: "auto",
} as const;
