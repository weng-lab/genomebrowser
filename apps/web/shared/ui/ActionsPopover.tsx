"use client";

import Popover from "@mui/material/Popover";
import { useId, useState, type ReactNode, type Ref } from "react";
import { MoreActionsButton } from "./MoreActionsButton";

type ActionsPopoverProps = {
  /** The button's and the popover's accessible name, such as "Actions for region HS2". */
  label: string;
  /** The more-actions button, such as to focus it when its row mounts again elsewhere. */
  buttonRef?: Ref<HTMLButtonElement>;
  /**
   * The popover's content, given a way to close it and the button that opened it. The popover
   * mounts it only while open, so each opening starts fresh.
   */
  children: (close: () => void, opener: HTMLElement | null) => ReactNode;
};

/**
 * A row's more-actions button, which opens a popover below it: a menu that can hold fields,
 * such as a name and color above its items. Focus returns to the button when it closes. For
 * a menu of actions alone, use `ActionMenu`.
 */
export function ActionsPopover({ label, buttonRef, children }: ActionsPopoverProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  const close = () => setAnchor(null);
  return (
    <>
      <MoreActionsButton
        ref={buttonRef}
        label={label}
        popup="dialog"
        controls={anchor ? popoverId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      />
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
