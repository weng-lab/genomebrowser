"use client";

import Add from "@mui/icons-material/Add";
import Divider from "@mui/material/Divider";
import MuiLink from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { SessionState } from "../session";
import { byRecent } from "../sessionDetails";
import { useSession } from "../SessionProvider";
import { useCreateDisabled } from "./NewSessionDialog";
import { labelSx, listSx, SessionList, SessionListStatus, textSx } from "./SessionList";
import { itemSx } from "./SessionRow";

/** Other sessions listed beside the open one. */
const RECENT_COUNT = 3;

type SessionMenuProps = {
  /** Called when a session is opened, to close the menu. */
  onDone: () => void;
  /** Called when New session is chosen, to ask for the session's name and assembly. */
  onNewSession: () => void;
};

/** Recent sessions with a link to all of them, then creating a session. */
export function SessionMenu({ onDone, onNewSession }: SessionMenuProps) {
  const ids = useSession(useShallow(recentIds));
  const labelId = useId();
  // Save times read relative to when the menu opened.
  const [now] = useState(() => new Date());

  return (
    <>
      <Typography
        id={labelId}
        variant="caption"
        display="block"
        color="text.secondary"
        sx={labelSx}
      >
        Recent sessions
      </Typography>
      <SessionList ids={ids} now={now} onOpen={onDone} aria-labelledby={labelId} />
      <SessionListStatus count={ids.length} empty="No saved sessions yet." />
      <MuiLink
        component={Link}
        href="/sessions"
        variant="body2"
        underline="hover"
        onClick={onDone}
        sx={allSessionsSx}
      >
        All sessions
      </MuiLink>

      <Divider sx={{ my: 0.25 }} />

      <List dense sx={listSx}>
        <NewSession onClick={onNewSession} />
      </List>
    </>
  );
}

/** Starts creating a session, while sessions can be created. */
function NewSession({ onClick }: { onClick: () => void }) {
  const disabled = useCreateDisabled();
  return (
    <ListItemButton disabled={disabled} onClick={onClick} sx={itemSx}>
      <ListItemIcon sx={iconSx}>
        <Add fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="New session" />
    </ListItemButton>
  );
}

/** The open session's ID first, then the most recently saved others. */
function recentIds({ sessions, active }: SessionState) {
  const others = sessions
    .filter(({ id }) => id !== active?.id)
    .toSorted(byRecent)
    .slice(0, RECENT_COUNT)
    .map(({ id }) => id);
  return active ? [active.id, ...others] : others;
}

/** A row's leading icon, just wide enough for its glyph. */
const iconSx = { minWidth: 28 } as const;

/** Below the rows, lined up with their text. */
const allSessionsSx = { ...textSx, display: "block", pt: 0.25, pb: 1 } as const;
