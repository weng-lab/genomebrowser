"use client";

import Check from "@mui/icons-material/Check";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
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
 * many tracks it has. The open session is highlighted and checked. The delete icon removes it.
 */
export function SessionRow({ id, now, onOpen }: SessionRowProps) {
  const find = ({ sessions }: SessionState) => sessions.find((saved) => saved.id === id);
  const name = useSession((session) => find(session)?.name);
  const savedAt = useSession((session) => find(session)?.updatedAt.getTime());
  const assembly = useSession((session) => find(session)?.assembly);
  const trackCount = useSession((session) => find(session)?.trackCount);
  const active = useSession((session) => session.active?.id === id);
  const busy = useSession((session) => session.pending !== undefined);
  const remove = useSession((session) => session.remove);

  const details =
    assembly !== undefined &&
    savedAt !== undefined &&
    trackCount !== undefined &&
    `${assembly} • ${formatSavedAt(new Date(savedAt), now)} • ${formatTrackCount(trackCount)}`;

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <IconButton
          edge="end"
          size="small"
          aria-label={`Delete session ${name}`}
          title={`Delete session ${name}`}
          disabled={busy}
          onClick={() => void remove(id)}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      }
    >
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

/**
 * A clickable menu row: close to the menu's left edge, with a rounded highlight inset
 * from it. The menu's other rows share it.
 */
export const itemSx = { mx: 0.5, px: 1, py: 0.75, borderRadius: 1 } as const;
