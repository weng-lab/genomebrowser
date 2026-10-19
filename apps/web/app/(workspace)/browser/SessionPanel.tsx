"use client";

import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { useState, type FormEvent } from "react";
import { supportedAssemblies } from "../../../assemblies/assemblies";
import { useSession } from "../../../sessions/SessionProvider";

const statusMessages = {
  loading: "Loading saved sessions…",
  unavailable: "Could not reach saved sessions. Retrying…",
  "signed-out": "Sign in to save sessions.",
  ready: "Sessions save automatically.",
};

export function SessionPanel() {
  const ids = useSession(useShallow((session) => session.sessions.map(({ id }) => id)));
  const activeId = useSession((session) => session.active?.id);
  const status = useSession((session) => session.status);
  return (
    <>
      {activeId && <RenameSession key={activeId} />}
      <List
        component="nav"
        aria-label="Browser sessions"
        dense
        sx={{ px: 1, flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {ids.map((id) => (
          <SessionRow key={id} id={id} />
        ))}
      </List>
      {/* Creating a session opens it, which resets the form. */}
      {status === "ready" && <CreateSession key={`new:${activeId}`} />}
      <Typography
        variant="body2"
        color={status === "unavailable" ? "error" : "text.secondary"}
        role="status"
        sx={{ p: 1.5, flexShrink: 0 }}
      >
        {status === "ready" && ids.length === 0 ? "No saved sessions yet." : statusMessages[status]}
      </Typography>
    </>
  );
}

function SessionRow({ id }: { id: string }) {
  const name = useSession((session) => session.sessions.find((saved) => saved.id === id)?.name);
  const activeId = useSession((session) => session.active?.id);
  const busy = useSession((session) => session.pending !== undefined);
  const remove = useSession((session) => session.remove);
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <ListItemButton
        component={Link}
        href={`/browser/${id}`}
        selected={id === activeId}
        aria-current={id === activeId ? "page" : undefined}
        sx={{ borderRadius: 1, flex: 1, minWidth: 0 }}
      >
        <ListItemText
          primary={name}
          slotProps={{ primary: { sx: { overflowWrap: "anywhere" } } }}
        />
      </ListItemButton>
      <IconButton
        aria-label={`Delete session ${name}`}
        title={`Delete session ${name}`}
        size="small"
        disabled={busy}
        onClick={() => void remove(id)}
      >
        <DeleteOutline fontSize="small" />
      </IconButton>
    </Box>
  );
}

/** Edit the open session's name. It saves with the session's other changes. */
function RenameSession() {
  const name = useSession((session) => session.active?.name ?? "");
  const rename = useSession((session) => session.rename);
  const [draft, setDraft] = useState(name);
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft !== name) rename(draft);
  }
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 1.5, flexShrink: 0 }}>
      <TextField
        label="Session name"
        size="small"
        fullWidth
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== name && rename(draft)}
      />
    </Box>
  );
}

function CreateSession() {
  const create = useSession((session) => session.create);
  const busy = useSession((session) => session.pending !== undefined);
  const [name, setName] = useState("");
  const [assembly, setAssembly] = useState(supportedAssemblies[0].id);
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void create({ name, assembly });
  }
  return (
    <Stack
      component="form"
      aria-label="New session"
      spacing={1}
      onSubmit={handleSubmit}
      sx={{ p: 1.5, flexShrink: 0, borderTop: 1, borderColor: "divider" }}
    >
      <TextField
        label="New session name"
        size="small"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <TextField
        select
        label="Assembly"
        size="small"
        value={assembly}
        onChange={(event) => setAssembly(event.target.value)}
      >
        {supportedAssemblies.map(({ id, label }) => (
          <MenuItem key={id} value={id}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <Button type="submit" variant="outlined" size="small" disabled={busy || !name.trim()}>
        Create session
      </Button>
    </Stack>
  );
}
