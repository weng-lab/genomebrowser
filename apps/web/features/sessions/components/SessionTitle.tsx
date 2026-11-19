"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState, type KeyboardEvent } from "react";
import { sessionInputSchema } from "../schema";
import { useSession } from "../SessionProvider";

/** The open session's name as the page heading. Clicking it edits the name in place. */
export function SessionTitle() {
  const id = useSession((session) => session.active?.id);
  const name = useSession((session) => session.active?.name);
  // Only shown while no session is open, so operations on an open one do not render it.
  const opening = useSession(
    (session) =>
      !session.active &&
      (session.pending?.operation === "open" ||
        session.pending?.operation === "create" ||
        session.pending?.operation === "copy"),
  );

  if (id === undefined || name === undefined)
    return (
      <Typography variant="body1" component="h1" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
        <Box component="span" sx={statusBoxSx}>
          {opening ? "Opening session…" : "No session open"}
        </Box>
      </Typography>
    );
  // Keyed by session, so opening another session ends an edit.
  return <SessionName key={id} name={name} />;
}

/** The open session's name, or the field editing it after the name is clicked. */
function SessionName({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <Typography variant="body1" component="h1" sx={{ minWidth: 0 }}>
        <RenameField initialName={name} onDone={() => setEditing(false)} />
      </Typography>
    );
  return (
    <Typography variant="body1" component="h1" noWrap sx={{ minWidth: 0 }}>
      <ButtonBase title="Rename session" onClick={() => setEditing(true)} sx={nameButtonSx}>
        {name}
      </ButtonBase>
    </Typography>
  );
}

/**
 * Edits the open session's name, starting with it all selected so typing replaces it.
 * Enter or leaving the field saves it; Escape cancels. Enter with a name that cannot be
 * saved keeps the field open with the draft, marked invalid; leaving the field with one
 * keeps the current name, since Escape no longer reaches the field.
 */
function RenameField({ initialName, onDone }: { initialName: string; onDone: () => void }) {
  const rename = useSession((session) => session.rename);
  const [draft, setDraft] = useState(initialName);
  const [rejected, setRejected] = useState(false);
  // Ending the edit removes the field, which may blur it; finish only once.
  const finished = useRef(false);

  const valid = sessionInputSchema.shape.name.safeParse(draft).success;

  function finish(save: boolean) {
    if (finished.current) return;
    if (save && !valid) return setRejected(true);
    finished.current = true;
    if (save && draft !== initialName) rename(draft);
    onDone();
  }
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") finish(true);
    else if (event.key === "Escape") finish(false);
  }

  return (
    <Tooltip
      open={rejected}
      title={nameRequired}
      placement="bottom-start"
      arrow
      describeChild
      disableFocusListener
      disableHoverListener
      disableTouchListener
    >
      <InputBase
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The field replaces the name the user just clicked to edit.
        autoFocus
        value={draft}
        error={rejected}
        onChange={(event) => {
          setDraft(event.target.value);
          setRejected(false);
        }}
        onBlur={() => finish(valid)}
        onKeyDown={handleKeyDown}
        onFocus={(event) => event.target.select()}
        inputProps={{
          "aria-label": "Session name",
          "aria-description": rejected ? nameRequired : undefined,
          maxLength: 200,
        }}
        sx={renameFieldSx}
      />
    </Tooltip>
  );
}

const nameRequired = "Enter a name, or press Escape to keep the current one.";

/**
 * The name and its rename field share one fixed-size outlined box, so neither editing nor
 * switching sessions changes its size. Long names end in an ellipsis.
 */
const nameBoxSx = {
  boxSizing: "border-box",
  height: 34,
  width: 200,
  maxWidth: "100%",
  px: 1.5,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "background.default",
} as const;

/** Holds the box's place while no session is open, so opening one does not move the controls. */
const statusBoxSx = {
  ...nameBoxSx,
  display: "block",
  lineHeight: "32px",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

/** Reads as the session's name in a box, which darkens its border on hover to show it can be edited. */
const nameButtonSx = {
  ...nameBoxSx,
  display: "block",
  font: "inherit",
  lineHeight: "32px",
  textAlign: "left",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "&:hover": { borderColor: "text.secondary" },
  "&.Mui-focusVisible": { outline: 2, outlineColor: "primary.main", outlineOffset: -1 },
} as const;

/** Sits where the name was, at the same size and padding. */
const renameFieldSx = {
  ...nameBoxSx,
  typography: "body1",
  "&.Mui-focused": { borderColor: "primary.main" },
  "& input": { p: 0, height: "auto" },
  "&.Mui-error": { borderColor: "error.main" },
} as const;
