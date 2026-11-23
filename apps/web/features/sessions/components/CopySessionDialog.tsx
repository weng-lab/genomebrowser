"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
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
 * Save a copy of session `id` and open it, optionally starting the copy's agent
 * thread from the original's conversation. Without that, the copy's agent
 * starts fresh.
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
  const copy = useSession((session) => session.copy);
  const [bringAgent, setBringAgent] = useState(false);
  const [copying, setCopying] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function save() {
    if (!bringAgent) {
      // Nothing more to wait for: the copy opens as it saves, as without this dialog.
      onClose();
      await copy(id);
      return;
    }
    setCopying(true);
    setFailure(undefined);
    try {
      const copyId = await copy(id);
      if (copyId)
        await copyAgentThread(id, copyId, AbortSignal.timeout(30_000)).catch(() => {
          throw new Error(
            "The session was copied, but its agent conversation could not be. The copy's agent starts fresh.",
          );
        });
      onClose();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The agent conversation was not copied.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Dialog open={open} onClose={copying ? undefined : onClose} maxWidth="xs">
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
              disabled={copying}
              onChange={(event) => setBringAgent(event.target.checked)}
            />
          }
          label="Bring the agent's conversation"
        />
        {failure && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {failure}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={copying}>
          {failure ? "Close" : "Cancel"}
        </Button>
        {!failure && (
          <Button variant="contained" disabled={copying} onClick={() => void save()}>
            {copying ? "Copying…" : "Save a copy"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
