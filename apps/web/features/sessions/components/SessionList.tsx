"use client";

import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import { useSession } from "../SessionProvider";
import { SessionRow } from "./SessionRow";

const statusMessages = {
  loading: "Loading saved sessions…",
  unavailable: "Could not reach saved sessions. Retrying…",
  "signed-out": "Sign in to save sessions.",
};

type SessionListProps = {
  ids: readonly string[];
  /** When the list opened, which save times are relative to. Omit to leave save times out. */
  now?: Date;
  /** Called when a row's link is followed. */
  onOpen?: () => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/** Rows for the saved sessions with `ids`, in that order. Nothing when there are none. */
export function SessionList({ ids, now, onOpen, ...label }: SessionListProps) {
  if (ids.length === 0) return null;
  return (
    <List component="nav" {...label} dense sx={listSx}>
      {ids.map((id) => (
        <SessionRow key={id} id={id} now={now} onOpen={onOpen} />
      ))}
    </List>
  );
}

/**
 * Why a list of `count` saved sessions shows fewer than it might: they are still loading,
 * cannot be reached, or need an account, or else `empty` when there are none.
 */
export function SessionListStatus({ count, empty }: { count: number; empty: string }) {
  const status = useSession((session) => session.status);
  let message: string | undefined;
  if (status !== "ready") message = statusMessages[status];
  else if (count === 0) message = empty;
  if (!message) return null;
  return (
    <Typography
      variant="body2"
      component="output"
      display="block"
      color={status === "unavailable" ? "error" : "text.secondary"}
      sx={{ ...textSx, py: 1.25 }}
    >
      {message}
    </Typography>
  );
}

/** A list of rows, spaced apart. */
export const listSx = { display: "flex", flexDirection: "column", gap: 0.25, py: 0.75 } as const;

/** Text outside a row, lined up with the rows' text. */
export const textSx = { px: 1.5 } as const;

/** Bold gray capitals above a list. */
export const labelSx = {
  ...textSx,
  pt: 1.25,
  pb: 0.75,
  fontWeight: "fontWeightBold",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;
