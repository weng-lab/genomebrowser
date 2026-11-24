"use client";

import ExpandMore from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { useId, useRef, useState } from "react";
import { narrowTitleRow } from "../../../shared/workspace/frame/layout";
import { SessionMenu } from "./SessionMenu";
import { SessionTitle } from "./SessionTitle";

type SessionSwitcherProps = {
  /** Called when the menu's All sessions is chosen, to show every saved session. */
  onAllSessions: () => void;
  /** Called when the menu's New session is chosen, to ask for the session's name and assembly. */
  onNewSession: () => void;
};

/**
 * The browser's title: the open session's name, which renames it when clicked,
 * and an arrow that opens the menu of recent sessions.
 */
export function SessionSwitcher({ onAllSessions, onNewSession }: SessionSwitcherProps) {
  // The whole title, so the menu lines up with the name's left edge. Set only while the
  // menu is open: Popover reads its anchor's document, which the server render lacks.
  const title = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = anchor !== null;
  const close = () => setAnchor(null);
  const menuId = useId();
  return (
    <Box ref={title} sx={switcherSx}>
      <SessionTitle />
      <IconButton
        size="small"
        color="primary"
        sx={{ flexShrink: 0, ml: 1 }}
        aria-label="Session menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setAnchor(title.current)}
      >
        <ExpandMore fontSize="small" />
      </IconButton>
      <Popover
        id={menuId}
        open={menuOpen}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 280, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <SessionMenu
          onDone={close}
          onNewSession={() => {
            close();
            onNewSession();
          }}
          onAllSessions={onAllSessions}
        />
      </Popover>
    </Box>
  );
}

/**
 * At most 360px or half the title row, so a long name truncates and leaves room for the
 * row's other controls. The arrow never shrinks. In a narrow row the controls drop their
 * labels, so the name takes whatever room they leave.
 */
const switcherSx = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  maxWidth: "min(360px, 50%)",
  [narrowTitleRow]: { maxWidth: "none" },
} as const;
