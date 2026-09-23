"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { createSession } from "./actions";

export function CreateSessionButton({
  assemblies,
  disabled,
}: {
  assemblies: { id: string; label: string }[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Untitled session");
  const [assemblyId, setAssemblyId] = useState(assemblies[0]?.id ?? "");
  const [error, submit, pending] = useActionState(async (): Promise<string | null> => {
    try {
      const result = await createSession({ name, assemblyId });
      if (!result.ok) return result.error;
      setOpen(false);
      router.push(`/browser/${result.id}`);
      return null;
    } catch {
      return "Your session could not be created. Please try again.";
    }
  }, null);
  return (
    <>
      <Button
        variant="contained"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
        }}
      >
        Create a session
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        aria-labelledby="create-session-title"
        fullWidth
        maxWidth="xs"
      >
        <form action={submit}>
          <DialogTitle id="create-session-title">Create a session</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Session name"
                value={name}
                required
                disabled={pending}
                slotProps={{ htmlInput: { maxLength: 100 } }}
                onChange={(event) => setName(event.target.value)}
              />
              <TextField
                select
                label="Assembly"
                value={assemblyId}
                disabled={pending}
                onChange={(event) => setAssemblyId(event.target.value)}
                helperText="A session's assembly cannot be changed."
              >
                {assemblies.map(({ id, label }) => (
                  <MenuItem key={id} value={id}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={pending || !name.trim() || !assemblyId}
            >
              {pending ? "Creating…" : "Create session"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
