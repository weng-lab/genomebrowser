import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { createContext, use, useCallback, useId, useState, type ReactNode } from "react";
import { MoreActionsButton } from "./MoreActionsButton";

export type ActionMenuProps = {
  /** Names the button and the menu, such as "Actions for region chr1:100-200". */
  label: string;
  disabled?: boolean;
  /** Set when the button sits at the end of a list row, so it lines up with the row's edge. */
  edge?: "end";
  /** The menu's items: `MenuAction`s, and dividers or subheaders between them. */
  children: ReactNode;
};

const CloseMenu = createContext<(() => void) | undefined>(undefined);

/**
 * A more-actions (⋮) button and the menu it opens, below the button. Choosing an action
 * closes the menu first. For a menu that holds fields as well, such as a name, use
 * `ActionsPopover`. Like any MUI menu, the items mount only while it is open, so they
 * can subscribe to state the row around the button does not need.
 */
export function ActionMenu({ label, disabled = false, edge, children }: ActionMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  // Stable, so opening and closing the menu does not re-render every action through context.
  const close = useCallback(() => setAnchor(null), []);
  return (
    <>
      <MoreActionsButton
        label={label}
        popup="menu"
        controls={anchor ? menuId : undefined}
        disabled={disabled}
        edge={edge}
        onClick={(event) => setAnchor(event.currentTarget)}
      />
      {/* Outside the menu, whose list looks for its first item among its direct children. */}
      <CloseMenu value={close}>
        <Menu
          id={menuId}
          anchorEl={anchor}
          open={anchor !== null}
          onClose={close}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            list: { dense: true, "aria-label": label },
            // Rounded as an `ActionsPopover` is.
            paper: { sx: { minWidth: 200, borderRadius: 3 } },
          }}
        >
          {children}
        </Menu>
      </CloseMenu>
    </>
  );
}

export type MenuActionProps = {
  icon: ReactNode;
  label: string;
  /** `danger` colors the action red, for deleting. */
  tone?: "default" | "danger";
  onClick: () => void;
};

/**
 * An action in an `ActionMenu`: an icon and a one-line label. Choosing it closes the menu,
 * then acts.
 */
export function MenuAction({ icon, label, tone = "default", onClick }: MenuActionProps) {
  const close = use(CloseMenu);
  if (!close) throw new Error("MenuAction must be rendered inside an ActionMenu.");
  const danger = tone === "danger";
  return (
    <MenuItem
      onClick={() => {
        close();
        onClick();
      }}
      sx={danger ? { color: "error.main" } : undefined}
    >
      <ListItemIcon sx={danger ? { color: "inherit" } : undefined}>{icon}</ListItemIcon>
      <ListItemText primary={label} slotProps={{ primary: { noWrap: true } }} />
    </MenuItem>
  );
}
