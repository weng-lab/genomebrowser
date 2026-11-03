"use client";

import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { useId, useRef, useState } from "react";
import { SessionMenu } from "./SessionMenu";
import { SessionTitle } from "./SessionTitle";

/**
 * The browser's title: the open session's name, which renames it when clicked,
 * and an arrow that opens the menu of recent sessions.
 */
export function SessionSwitcher() {
  // The whole title, so the menu lines up with the name's left edge. Set only while the
  // menu is open: Popover reads its anchor's document, which the server render lacks.
  const title = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = anchor !== null;
  const close = () => setAnchor(null);
  const menuId = useId();
  return (
    <Box ref={title} sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
      <SessionTitle />
      <IconButton
        size="small"
        aria-label="Sessions"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setAnchor(title.current)}
      >
        <ArrowDropDown fontSize="small" />
      </IconButton>
      <Popover
        id={menuId}
        open={menuOpen}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 280, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <SessionMenu onDone={close} />
      </Popover>
    </Box>
  );
}
