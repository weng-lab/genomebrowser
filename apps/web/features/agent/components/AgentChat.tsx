"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { activeTurn, openInteractions } from "eve/events";
import { useAgentSession } from "../useAgentSession";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

/** One ephemeral conversation, remounted when the browser session changes. */
export function AgentChat({
  sessionId,
  signal,
  connected,
}: {
  sessionId: string;
  signal: AbortSignal;
  connected: boolean;
}) {
  const agent = useAgentSession(sessionId, signal);
  const [draft, setDraft] = useState("");
  const [failure, setFailure] = useState<string>();
  const transcript = useRef<HTMLDivElement>(null);
  const pending = openInteractions(agent.view).filter((item) => item.answer === undefined);
  const busy = agent.status !== "idle";
  const running = busy || activeTurn(agent.view) !== undefined;

  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [agent.messages]);

  function report(error: unknown) {
    setFailure(error instanceof Error ? error.message : "The agent request failed.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy || !connected || signal.aborted) return;
    setFailure(undefined);
    setDraft("");
    try {
      const question = pending[0];
      if (question)
        await agent.store.send({
          answers: [{ interactionId: question.interactionId, text: message }],
        });
      else await agent.store.send({ message });
    } catch (error) {
      setDraft(message);
      report(error);
    }
  }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Box
        ref={transcript}
        role="log"
        aria-label="Agent conversation"
        sx={{ overflow: "auto", flex: 1 }}
      >
        {agent.messages.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ask a question, navigate to coordinates, or export an image.
          </Typography>
        )}
        {agent.messages.map((message) => (
          <Box key={message.id} sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight="bold">
              {message.role === "user" ? "You" : "Agent"}
            </Typography>
            {message.parts.map((part) => {
              if (part.type === "text")
                return (
                  <Typography
                    key={part.id ?? message.id}
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {part.text}
                  </Typography>
                );
              if (part.type === "tool")
                return (
                  <Typography
                    key={part.callId}
                    variant="caption"
                    component="p"
                    color="text.secondary"
                  >
                    {part.label}: {part.state}
                    {part.error ? ` — ${part.error.message}` : ""}
                  </Typography>
                );
              return null;
            })}
          </Box>
        ))}
      </Box>
      {pending.map(({ interactionId, request }) => (
        <Box key={interactionId}>
          <Typography variant="body2">{request.prompt}</Typography>
          {request.options?.map((option) => (
            <Button
              key={option.id}
              disabled={busy || !connected}
              onClick={() => {
                setFailure(undefined);
                void agent.store
                  .send({ answers: [{ interactionId, optionId: option.id }] })
                  .catch(report);
              }}
            >
              {option.label}
            </Button>
          ))}
        </Box>
      ))}
      {(failure || agent.error) && (
        <Alert severity="error">{failure ?? agent.error?.message}</Alert>
      )}
      <Box
        component="form"
        onSubmit={(event) => {
          void submit(event).catch(report);
        }}
      >
        <TextField
          label={pending.length ? "Answer the agent" : "Message the agent"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!connected || busy}
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          size="small"
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button type="submit" variant="contained" disabled={!connected || busy || !draft.trim()}>
            Send
          </Button>
          {running && (
            <Button
              onClick={() => {
                setFailure(undefined);
                void agent.store.cancel().catch(report);
              }}
            >
              Stop
            </Button>
          )}
          {busy && (
            <Typography component="output" variant="body2" sx={{ alignSelf: "center" }}>
              Working…
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
