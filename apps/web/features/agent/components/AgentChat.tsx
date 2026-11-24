"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SessionSnapshot } from "eve/client";
import { activeTurn, openInteractions } from "eve/events";
import { useHoldSession } from "../../sessions/SessionProvider";
import { useAgentControlHandle } from "../RemoteControlProvider";
import { useAgentSession } from "../useAgentSession";
import { isLostConversation, useAgentThread } from "../useAgentThread";

type ChatProps = { sessionId: string; signal: AbortSignal; connected: boolean };

/** The browser session's agent thread, remounted when the browser session changes. */
export function AgentChat({ sessionId, signal, connected }: ChatProps) {
  const thread = useAgentThread(sessionId, signal);
  if (thread.status === "loading")
    return (
      <Typography component="output" variant="body2" color="text.secondary">
        Loading the conversation…
      </Typography>
    );
  if (thread.status === "failed") return <Alert severity="error">{thread.error.message}</Alert>;
  return (
    <Conversation
      sessionId={sessionId}
      signal={signal}
      connected={connected}
      saved={thread.saved}
      replace={thread.replace}
    />
  );
}

function Conversation({
  sessionId,
  signal,
  connected,
  saved,
  replace,
}: ChatProps & {
  saved: SessionSnapshot | null;
  replace: (conversationId: string) => Promise<void>;
}) {
  const [failure, setFailure] = useState<string>();
  const report = useCallback((error: unknown) => {
    setFailure(error instanceof Error ? error.message : "The agent request failed.");
  }, []);
  // Eve can no longer continue this conversation, such as one stranded by an
  // upgrade or ended, so start the session's thread afresh.
  const onLost = useCallback(
    (conversationId: string) => {
      replace(conversationId).catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : "The agent request failed.");
      });
    },
    [replace],
  );
  const agent = useAgentSession(sessionId, saved, signal, onLost);
  const [draft, setDraft] = useState("");
  const transcript = useRef<HTMLDivElement>(null);
  const pending = openInteractions(agent.view).filter((item) => item.answer === undefined);
  // Ending the conversation for New conversation is neither a run nor a time to send.
  const [restarting, setRestarting] = useState(false);
  const busy = agent.status !== "idle" || restarting;
  // Catching up on a saved conversation blocks sending but is not work to stop.
  const running = !restarting && (agent.status === "busy" || activeTurn(agent.view) !== undefined);
  const conversationId = agent.session?.sessionId;

  /**
   * End this conversation in Eve, then start the session's thread clean. When it
   * cannot be ended, the thread stays, so the user can try again; releasing it
   * would leave a conversation no one can reach running for good.
   */
  async function startOver(id: string) {
    setRestarting(true);
    try {
      await agent.store.end().catch((error: unknown) => {
        if (!isLostConversation(error)) throw error;
      });
      await replace(id);
    } finally {
      setRestarting(false);
    }
  }

  // Stop in the browser's control banner stops this run, and a run that ends,
  // however it ends, gives control of the browser back.
  const control = useAgentControlHandle();
  useEffect(() => {
    if (!running) return;
    return control.onStop(() => {
      agent.store.cancel().catch(report);
    });
  }, [running, control, agent.store, report]);
  const wasRunning = useRef(running);
  useEffect(() => {
    if (wasRunning.current && !running) control.release();
    wasRunning.current = running;
  }, [running, control]);

  // Switching sessions or leaving the page stops a run, so ask first.
  useHoldSession(
    running ? "Your agent is still working. Switching sessions will stop it." : undefined,
  );
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [agent.messages]);

  async function submitMessage() {
    const message = draft.trim();
    if (!message || busy || !connected || signal.aborted) return;
    setFailure(undefined);
    setDraft("");
    try {
      const question = pending[0];
      if (question) {
        await agent.store.send({
          answers: [{ interactionId: question.interactionId, text: message }],
        });
      } else {
        await agent.store.send({ message });
      }
    } catch (error) {
      setDraft(message);
      report(error);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitMessage().catch(report);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitMessage().catch(report);
    }
  }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Box
        ref={transcript}
        role="log"
        aria-label="Agent conversation"
        sx={{ overflow: "auto", flex: 1, minHeight: 0 }}
      >
        {agent.messages.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ask the agent to navigate, inspect or add tracks, sort tracks, tag metadata, or export
            an image.
          </Typography>
        )}
        {agent.messages.map((message) => (
          <Box key={message.id} sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight="bold" component="div" sx={{ mb: 0.5 }}>
              {message.role === "user" ? "You" : "Agent"}
            </Typography>
            {message.parts.map((part) => {
              if (part.type === "text") {
                return (
                  <Typography
                    key={part.id ?? `${message.id}:${part.text}`}
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {part.text}
                  </Typography>
                );
              }
              if (part.type === "tool") {
                return (
                  <Typography
                    key={part.callId}
                    variant="caption"
                    component="p"
                    color="text.secondary"
                    sx={{ my: 0.5 }}
                  >
                    {part.label}: {part.state}
                    {part.error ? ` — ${part.error.message}` : ""}
                  </Typography>
                );
              }
              return null;
            })}
          </Box>
        ))}
      </Box>

      {pending.map(({ interactionId, request }) => (
        <Stack key={interactionId} spacing={1}>
          <Typography variant="body2">{request.prompt}</Typography>
          {request.options && request.options.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {request.options.map((option) => (
                <Button
                  key={option.id}
                  size="small"
                  variant="outlined"
                  disabled={busy || !connected}
                  onClick={() => {
                    setFailure(undefined);
                    agent.store
                      .send({ answers: [{ interactionId, optionId: option.id }] })
                      .catch(report);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
      ))}

      {(failure || agent.error) && (
        <Alert severity="error">{failure ?? agent.error?.message}</Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label={pending.length ? "Answer the agent" : "Message the agent"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!connected || busy}
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          size="small"
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Button
            type="submit"
            size="small"
            variant="contained"
            disabled={!connected || busy || !draft.trim()}
          >
            Send
          </Button>
          {running && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setFailure(undefined);
                control.release();
                agent.store.cancel().catch(report);
              }}
            >
              Stop
            </Button>
          )}
          {running && (
            <Typography component="output" variant="body2" color="text.secondary">
              Working…
            </Typography>
          )}
          {conversationId && !busy && !running && (
            <Button
              size="small"
              sx={{ ml: "auto" }}
              onClick={() => {
                setFailure(undefined);
                startOver(conversationId).catch(report);
              }}
            >
              New conversation
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
