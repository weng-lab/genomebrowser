"use client";

import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import { copyAgentThread } from "../../agent/threadCopy";
import { useSession } from "../SessionProvider";

/**
 * Ask how to copy session `id`, then save the copy and open it. With "Bring the
 * agent's conversation", the copy's agent thread starts from the original's
 * before the copy opens; without it, the copy's agent starts fresh. The dialog
 * closes as the copy starts, and the session reports any failure.
 */
export function CopySessionDialog({
  id,
  name,
  open,
  onClose,
}: {
  id: string;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      {/* Mounted only while open, so each opening starts with the defaults. */}
      {open && <CopySessionForm id={id} name={name} onClose={onClose} />}
    </Dialog>
  );
}

function CopySessionForm({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const copy = useSession((session) => session.copy);
  const [bringAgent, setBringAgent] = useState(false);

  function save(event: FormEvent) {
    event.preventDefault();
    onClose();
    // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
    void copy(
      id,
      bringAgent
        ? { beforeOpen: (copyId) => copyAgentThread(id, copyId, AbortSignal.timeout(30_000)) }
        : undefined,
    );
  }

  return (
    <Box component="form" onSubmit={save}>
      <DialogTitle>Save a copy of “{name}”</DialogTitle>
      <DialogContent>
        <DialogContentText>
          The copy has its own tracks, regions, and settings. Its agent starts fresh unless you
          bring this session's conversation along.
        </DialogContentText>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              checked={bringAgent}
              onChange={(event) => setBringAgent(event.target.checked)}
            />
          }
          label="Bring the agent's conversation"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          Save a copy
        </Button>
      </DialogActions>
    </Box>
  );
}
