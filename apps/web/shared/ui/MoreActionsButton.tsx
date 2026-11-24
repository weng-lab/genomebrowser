import MoreVert from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import type { MouseEvent, Ref } from "react";

export type MoreActionsButtonProps = {
  /** The button's accessible name and tooltip, such as "Actions for region HS2". */
  label: string;
  /** What it opens: a `menu` of actions, or a `dialog` that holds fields as well. */
  popup: "menu" | "dialog";
  /** The open popup's ID, or undefined while it is closed. */
  controls: string | undefined;
  disabled?: boolean;
  /** Set when the button sits at the end of a list row, so it lines up with the row's edge. */
  edge?: "end";
  ref?: Ref<HTMLButtonElement>;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * The more-actions (⋮) button that `ActionMenu` and `ActionsPopover` open from, so every row's
 * actions look and are announced alike.
 */
export function MoreActionsButton({
  label,
  popup,
  controls,
  disabled = false,
  edge,
  ref,
  onClick,
}: MoreActionsButtonProps) {
  return (
    <IconButton
      ref={ref}
      size="small"
      edge={edge}
      aria-label={label}
      title={label}
      aria-haspopup={popup}
      aria-controls={controls}
      aria-expanded={controls ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <MoreVert fontSize="small" />
    </IconButton>
  );
}
