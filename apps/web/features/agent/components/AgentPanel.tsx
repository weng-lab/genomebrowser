"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AgentChat } from "./AgentChat";
import { useRemoteControl } from "../RemoteControl";
import { useSession } from "../../sessions/SessionProvider";

export function AgentPanel() {
  const { state, enabled } = useRemoteControl();
  const sessionId = useSession((session) => session.active?.id);
  // The session updates its state whenever the signal aborts, so this stays current.
  const signal = useSession((session) => session.active?.signal);
  const ended = useSession((session) => session.active?.signal.aborted);
  let message = "Remote control is off. Turn it on in Settings.";
  if (enabled && !sessionId) message = "Open a session to connect it to agents.";
  else if (enabled && ended)
    message = "This session's changes can no longer be saved, so agents cannot control it.";
  else if (enabled && state === "connected")
    message = `Connected. Agent commands for session "${sessionId}" run in this tab.`;
  else if (enabled && state === "superseded")
    message = "Agent control moved to a newer tab. Reload this page to use this tab instead.";
  else if (enabled) message = "Connecting…";
  return (
    <Box sx={{ p: 2, height: "100%", minHeight: 0, boxSizing: "border-box" }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Typography component="output" variant="body2">
          {message}
        </Typography>
        {enabled && sessionId && signal && !ended && state !== "superseded" && (
          <AgentChat
            key={sessionId}
            sessionId={sessionId}
            signal={signal}
            connected={state === "connected"}
          />
        )}
      </Stack>
    </Box>
  );
}
