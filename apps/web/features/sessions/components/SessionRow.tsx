"use client";

import Check from "@mui/icons-material/Check";
import ContentCopy from "@mui/icons-material/ContentCopy";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import MoreVert from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import { useId, useState } from "react";
import type { SessionState } from "../session";
import { formatSavedAt, formatTrackCount } from "../sessionDetails";
import { useSession } from "../SessionProvider";

type SessionRowProps = {
  id: string;
  /** When the menu opened, which save times are relative to. */
  now: Date;
  /** Called when the row's link is followed, to close the menu. */
  onOpen: () => void;
};

/**
 * A recent session's link: its name, then its assembly, when it was last saved, and how
 * many tracks it has. The open session is highlighted and checked. Its actions menu copies or deletes it.
 */
export function SessionRow({ id, now, onOpen }: SessionRowProps) {
  const find = ({ sessions }: SessionState) => sessions.find((saved) => saved.id === id);
  const name = useSession((session) => find(session)?.name);
  const savedAt = useSession((session) => find(session)?.updatedAt.getTime());
  const assembly = useSession((session) => find(session)?.assembly);
  const trackCount = useSession((session) => find(session)?.trackCount);
  const active = useSession((session) => session.active?.id === id);

  const details =
    assembly !== undefined &&
    savedAt !== undefined &&
    trackCount !== undefined &&
    `${assembly} • ${formatSavedAt(new Date(savedAt), now)} • ${formatTrackCount(trackCount)}`;

  return (
    <ListItem disablePadding secondaryAction={<SessionActions id={id} name={name} />}>
      <ListItemButton
        component={Link}
        href={`/browser/${id}`}
        selected={active}
        aria-current={active ? "page" : undefined}
        onClick={onOpen}
        sx={itemSx}
      >
        <ListItemText
          primary={name}
          secondary={details}
          slotProps={{
            primary: { noWrap: true, sx: { fontWeight: "fontWeightBold" } },
            secondary: { noWrap: true, variant: "caption", display: "block" },
          }}
        />
        {/* After the name, so rows need no icon column before it. */}
        {active && <Check fontSize="small" sx={{ ml: 1, flexShrink: 0, color: "primary.main" }} />}
      </ListItemButton>
    </ListItem>
  );
}

/** A session's more-actions button and the menu it opens: save a copy and delete. */
function SessionActions({ id, name }: { id: string; name: string | undefined }) {
  const busy = useSession((session) => session.pending !== undefined);
  const copy = useSession((session) => session.copy);
  const remove = useSession((session) => session.remove);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const label = `Actions for session ${name}`;
  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        edge="end"
        size="small"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        disabled={busy}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ list: { dense: true, "aria-label": label } }}
      >
        <MenuItem
          onClick={() => {
            close();
            // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
            void copy(id);
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Save a copy" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
            void remove(id);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
    </>
  );
}

/**
 * A clickable menu row: close to the menu's left edge, with a rounded highlight inset
 * from it. The menu's other rows share it.
 */
export const itemSx = { mx: 0.5, px: 1, py: 0.75, borderRadius: 1 } as const;
