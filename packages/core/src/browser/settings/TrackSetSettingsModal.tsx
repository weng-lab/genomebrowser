import { useCallback, useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material/styles";
import {
  SETTINGS_MODAL_VIEWPORT_INSET,
  useDraggableSettingsModal,
} from "./useDraggableSettingsModal";
import type { SettingsPosition } from "./types";

/** Track-set window matching the individual settings layout and drag behavior. */
export function TrackSetSettingsModal({
  title,
  position,
  closeSettings,
  children,
}: {
  title: string;
  position: SettingsPosition;
  closeSettings: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const { position: dragPosition, modalRef, handleProps } = useDraggableSettingsModal(position);
  const attachDialog = useCallback(
    (element: HTMLDialogElement | null) => {
      dialog.current = element;
      modalRef(element);
    },
    [modalRef],
  );
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && !event.defaultPrevented) closeSettings();
  });

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (
        (previousFocus instanceof HTMLElement || previousFocus instanceof SVGElement) &&
        previousFocus.isConnected
      )
        previousFocus.focus();
    };
  }, []);

  return (
    <Paper
      component="dialog"
      open
      role="dialog"
      ref={attachDialog}
      tabIndex={-1}
      aria-labelledby={titleId}
      style={{
        position: "fixed",
        zIndex: theme.zIndex.modal,
        boxSizing: "border-box",
        width: "550px",
        maxWidth: `calc(100vw - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px)`,
        maxHeight: `min(550px, calc(100vw - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px), calc(100dvh - ${SETTINGS_MODAL_VIEWPORT_INSET * 2}px))`,
        left: dragPosition.x,
        top: dragPosition.y,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[8],
        fontFamily: theme.typography.fontFamily,
        fontSize: "14px",
      }}
    >
      <Box
        {...handleProps}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "10px 12px",
          fontWeight: 700,
          background: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          ...handleProps.style,
        }}
      >
        <Box
          component="h2"
          id={titleId}
          sx={{ m: 0, minWidth: 0, font: "inherit", overflowWrap: "anywhere" }}
        >
          Configure {title}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <IconButton
            aria-label="Close settings"
            title="Close settings"
            onClick={closeSettings}
            onPointerDown={(event) => event.stopPropagation()}
            sx={{ color: "inherit", width: 28, height: 28, p: 0, my: "-4px", borderRadius: 1 }}
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
          </IconButton>
        </Box>
      </Box>
      <Box
        style={{ display: "grid", gap: "12px", padding: "12px", minHeight: 0, overflowY: "auto" }}
      >
        {children}
      </Box>
    </Paper>
  );
}
