"use client";

import Check from "@mui/icons-material/Check";
import ContentCopy from "@mui/icons-material/ContentCopy";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
import { ActionMenu, MenuAction } from "../../../shared/ui/ActionMenu";
import type { SessionState } from "../session";
import { formatSavedAt, formatTrackCount } from "../sessionDetails";
import { useSession } from "../SessionProvider";

type SessionRowProps = {
  id: string;
  /**
   * When the list opened, which save times are relative to. Without it the row leaves out
   * when it was saved, such as in a list grouped by that.
   */
  now?: Date;
  /** Called when the row's link is followed, such as to close the menu. */
  onOpen?: () => void;
};

/**
 * A saved session's link: its name, then its assembly, when it was last saved when `now`
 * is given, and how many tracks it has. The open session is highlighted and checked. Its actions menu copies or deletes it.
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
    [assembly, now && formatSavedAt(new Date(savedAt), now), formatTrackCount(trackCount)]
      .filter(Boolean)
      .join(" • ");

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
  return (
    <ActionMenu label={`Actions for session ${name}`} edge="end" disabled={busy}>
      <MenuAction
        icon={<ContentCopy fontSize="small" />}
        label="Save a copy"
        onClick={() => void copy(id)}
      />
      <MenuAction
        icon={<DeleteOutline fontSize="small" />}
        label="Delete"
        tone="danger"
        onClick={() => void remove(id)}
      />
    </ActionMenu>
  );
}

/**
 * A clickable menu row: close to the menu's left edge, with a rounded highlight inset
 * from it. The menu's other rows share it.
 */
export const itemSx = { mx: 0.5, px: 1, py: 0.75, borderRadius: 1 } as const;
