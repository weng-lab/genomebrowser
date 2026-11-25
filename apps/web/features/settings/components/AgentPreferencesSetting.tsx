"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AccountSettingsError, requestAgentPreferences } from "../../account/settings";

const maxLength = 1_000;

type State =
  | { status: "loading" | "signed-out" }
  | { status: "ready" | "saving" | "saved"; saved: string }
  | { status: "failed"; saved?: string; error: string };

const message = (error: unknown) =>
  error instanceof AccountSettingsError ? error.message : "Agent preferences are unavailable";

/** The account's standing instructions for the agent, saved when the user chooses. */
export function AgentPreferencesSetting() {
  const heading = useId();
  const description = useId();
  const [state, setState] = useState<State>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [attempt, setAttempt] = useState(0);
  // The save in flight, so another waits for it and leaving the page stops it.
  const saving = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    requestAgentPreferences(controller.signal)
      .then(({ text }) => {
        setState({ status: "ready", saved: text });
        setDraft(text);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AccountSettingsError && error.code === "UNAUTHENTICATED")
          setState({ status: "signed-out" });
        else setState({ status: "failed", error: message(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => () => saving.current?.abort(), []);

  const saved = "saved" in state ? state.saved : undefined;
  const busy = state.status === "saving";
  const changed = saved !== undefined && draft.trim() !== saved;

  function save(event: FormEvent) {
    event.preventDefault();
    if (saved === undefined || !changed || saving.current) return;
    const controller = new AbortController();
    saving.current = controller;
    setState({ status: "saving", saved });
    requestAgentPreferences(controller.signal, { text: draft })
      .then(({ text }) => {
        if (controller.signal.aborted) return;
        setState({ status: "saved", saved: text });
        setDraft(text);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ status: "failed", saved, error: message(error) });
      })
      .finally(() => {
        if (saving.current === controller) saving.current = undefined;
      });
  }

  const status = {
    loading: "Loading…",
    saving: "Saving…",
    saved: changed ? "" : "Saved",
    "signed-out": "Sign in to set agent preferences.",
    ready: "",
    failed: "",
  }[state.status];

  return (
    <Box component="form" onSubmit={save} aria-labelledby={heading} sx={{ p: 1, mt: 2 }}>
      <Typography id={heading} variant="subtitle2" component="h2">
        Agent preferences
      </Typography>
      <Typography id={description} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Tell the agent how you like to work, such as your usual assembly, preferred track colors, or
        how much to explain. It reads these before every message in every session.
      </Typography>
      <TextField
        label="Preferences"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={saved === undefined || busy}
        slotProps={{
          htmlInput: { maxLength, "aria-describedby": description },
        }}
        helperText={`${draft.length}/${maxLength}`}
        fullWidth
        multiline
        minRows={3}
        maxRows={10}
        size="small"
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <Button type="submit" size="small" variant="contained" disabled={!changed || busy}>
          Save
        </Button>
        {changed && (
          <Button
            size="small"
            disabled={busy}
            onClick={() => {
              setDraft(saved);
              setState({ status: "ready", saved });
            }}
          >
            Discard
          </Button>
        )}
        <Typography component="output" variant="body2" color="text.secondary">
          {status}
        </Typography>
      </Stack>
      {state.status === "failed" && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          action={
            saved === undefined && (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setState({ status: "loading" });
                  setAttempt((value) => value + 1);
                }}
              >
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
