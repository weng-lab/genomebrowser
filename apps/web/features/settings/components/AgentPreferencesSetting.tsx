"use client";

import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AccountSettingsError, requestAgentPreferences } from "../../account/settings";

const maxLength = 1_000;

type State =
  | { status: "loading" }
  | { status: "ready" | "saving"; saved: string }
  | { status: "failed"; saved?: string; error: string };

const message = (error: unknown) =>
  error instanceof AccountSettingsError ? error.message : "Agent preferences are unavailable";

/** The account's standing instructions for the agent, saved when the user chooses. */
export function AgentPreferencesSetting() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    requestAgentPreferences(controller.signal)
      .then(({ text }) => {
        setState({ status: "ready", saved: text });
        setDraft(text);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "failed", error: message(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  const saved = "saved" in state ? state.saved : undefined;
  const changed = saved !== undefined && draft.trim() !== saved;

  function save(event: FormEvent) {
    event.preventDefault();
    if (saved === undefined || !changed) return;
    setState({ status: "saving", saved });
    requestAgentPreferences(new AbortController().signal, { text: draft })
      .then(({ text }) => {
        setState({ status: "ready", saved: text });
        setDraft(text);
      })
      .catch((error: unknown) => setState({ status: "failed", saved, error: message(error) }));
  }

  return (
    <Box component="form" onSubmit={save} sx={{ p: 1, mt: 2 }}>
      <Typography variant="subtitle2">Agent preferences</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Tell the agent how you like to work, such as your usual assembly, preferred track colors, or
        how much to explain. It reads these before every message in every session.
      </Typography>
      <TextField
        label="Preferences"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={saved === undefined || state.status === "saving"}
        slotProps={{ htmlInput: { maxLength } }}
        helperText={`${draft.length}/${maxLength}`}
        fullWidth
        multiline
        minRows={3}
        maxRows={10}
        size="small"
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <Button
          type="submit"
          size="small"
          variant="contained"
          disabled={!changed || state.status === "saving"}
        >
          Save
        </Button>
        {changed && (
          <Button size="small" onClick={() => setDraft(saved)}>
            Discard
          </Button>
        )}
        <Typography component="output" variant="body2" color="text.secondary">
          {state.status === "loading" ? "Loading…" : state.status === "saving" ? "Saving…" : ""}
        </Typography>
      </Stack>
      {state.status === "failed" && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          action={
            saved === undefined && (
              <Button color="inherit" size="small" onClick={() => setAttempt((value) => value + 1)}>
                Retry
              </Button>
            )
          }
        >
          {state.error}
        </Alert>
      )}
    </Box>
  );
}
