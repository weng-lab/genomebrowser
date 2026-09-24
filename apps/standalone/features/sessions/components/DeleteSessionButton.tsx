"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useState, useTransition } from "react";
import { useActiveSession } from "../activeSession";
import { deleteSession } from "../actions";

export function DeleteSessionButton({ id, name }: { id: string; name: string }) {
  const { clearIfActive } = useActiveSession();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        color="error"
        size="small"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        aria-labelledby={`delete-${id}`}
      >
        <DialogTitle id={`delete-${id}`}>Delete session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete "{name}" and its saved browser and track settings? This cannot be undone.
          </DialogContentText>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await deleteSession(id);
                  if (result.ok) {
                    clearIfActive(id);
                    setOpen(false);
                  } else setError(result.error);
                } catch {
                  setError("Your session could not be deleted. Please try again.");
                }
              })
            }
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
