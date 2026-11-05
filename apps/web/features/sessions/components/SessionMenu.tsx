"use client";

import Add from "@mui/icons-material/Add";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Session } from "../schema";
import type { SessionState } from "../session";
import { useSession } from "../SessionProvider";
import { itemSx, SessionRow } from "./SessionRow";

/** Other sessions listed beside the open one. */
const RECENT_COUNT = 3;

const statusMessages = {
  loading: "Loading saved sessions…",
  unavailable: "Could not reach saved sessions. Retrying…",
  "signed-out": "Sign in to save sessions.",
};

type SessionMenuProps = {
  /** Called when a session is opened, to close the menu. */
  onDone: () => void;
  /** Called when New session is chosen, to ask for the session's name and assembly. */
  onNewSession: () => void;
};

/** Recent sessions, then opening and creating sessions. */
export function SessionMenu({ onDone, onNewSession }: SessionMenuProps) {
  const ids = useSession(useShallow(recentIds));
  const status = useSession((session) => session.status);
  const labelId = useId();
  // Save times read relative to when the menu opened.
  const [now] = useState(() => new Date());

  let message: string | undefined;
  if (status !== "ready") message = statusMessages[status];
  else if (ids.length === 0) message = "No saved sessions yet.";

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
      {ids.length > 0 && (
        <List component="nav" aria-labelledby={labelId} dense sx={listSx}>
          {ids.map((id) => (
            <SessionRow key={id} id={id} now={now} onOpen={onDone} />
          ))}
        </List>
      )}
      {message && (
        <Typography
          variant="body2"
          component="output"
          display="block"
          color={status === "unavailable" ? "error" : "text.secondary"}
          sx={{ ...textSx, py: 1.25 }}
        >
          {message}
        </Typography>
      )}

      <Divider sx={{ my: 0.25 }} />

      <List dense sx={listSx}>
        {/* Browsing every saved session comes with #334. */}
        <ListItemButton disabled sx={itemSx}>
          <ListItemIcon sx={iconSx}>
            <FolderOpenOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Open session…" />
        </ListItemButton>
        <NewSession onClick={onNewSession} />
      </List>
    </>
  );
}

/** Starts creating a session, while sessions can be created. */
function NewSession({ onClick }: { onClick: () => void }) {
  const disabled = useSession(
    (session) => session.status !== "ready" || session.pending !== undefined,
  );
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

const byRecent = (a: Session, b: Session) =>
  b.updatedAt.getTime() - a.updatedAt.getTime() || a.name.localeCompare(b.name);

/** A list of rows, spaced apart. */
const listSx = { display: "flex", flexDirection: "column", gap: 0.25, py: 0.75 } as const;

/** Text outside a row, lined up with the rows' text. */
const textSx = { px: 1.5 } as const;

/** A row's leading icon, just wide enough for its glyph. */
const iconSx = { minWidth: 28 } as const;

/** Bold gray capitals above the list. */
const labelSx = {
  ...textSx,
  pt: 1.25,
  pb: 0.75,
  fontWeight: "fontWeightBold",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;
