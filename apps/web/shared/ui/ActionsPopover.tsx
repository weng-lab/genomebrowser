"use client";

import MoreVert from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { useId, useState, type ReactNode } from "react";

type ActionsPopoverProps = {
  /** The button's and the popover's accessible name, such as "Actions for region HS2". */
  label: string;
  /**
   * The popover's content, given a way to close it and the button that opened it. The popover
   * mounts it only while open, so each opening starts fresh.
   */
  children: (close: () => void, opener: HTMLElement | null) => ReactNode;
};

/**
 * A row's more-actions button, which opens a popover below it: a menu that can hold fields,
 * such as a name and color above its items. Focus returns to the button when it closes.
 */
export function ActionsPopover({ label, children }: ActionsPopoverProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  const close = () => setAnchor(null);
  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-controls={anchor ? popoverId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            id: popoverId,
            role: "dialog",
            "aria-label": label,
            sx: { width: 300, borderRadius: 3 },
          },
        }}
      >
        {children(close, anchor)}
      </Popover>
    </>
  );
}
