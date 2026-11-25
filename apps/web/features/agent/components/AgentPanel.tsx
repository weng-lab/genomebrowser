"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRemoteControl } from "../RemoteControlProvider";
import { useSession } from "../../sessions/SessionProvider";
import { AgentChat } from "./AgentChat";

export function AgentPanel() {
  const { state, preference } = useRemoteControl();
  const enabled = preference.allowed;
  const sessionId = useSession((session) => session.active?.id);
  const signal = useSession((session) => session.active?.signal);
  // The session updates its state whenever the signal aborts, so this stays current.
  const ended = useSession((session) => session.active?.signal.aborted);
  let message = "Remote control is off. Turn it on in Settings.";
  if (preference.status === "loading") message = "Loading remote control settings…";
  else if (preference.status === "signed-out") message = "Sign in to use remote control.";
  else if (preference.status === "unavailable")
    message = "Remote control settings could not be loaded. Retry in Settings.";
  else if (enabled && !sessionId) message = "Open a session to connect it to agents.";
  else if (enabled && ended)
    message = "This session's changes can no longer be saved, so agents cannot control it.";
  else if (enabled && state === "connected")
    message = `Connected. MCP tools called with sessionId "${sessionId}" run in this tab.`;
  else if (enabled)
    message =
      "Connecting… If this session is open in another tab, close that tab to use AI Assist and browser-only tools (image export, adding tracks) here. State tools still work.";

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Typography component="output" variant="body2" color="text.secondary">
          {message}
        </Typography>
        {enabled && sessionId && signal && !ended ? (
          <AgentChat
            key={sessionId}
            sessionId={sessionId}
            signal={signal}
            connected={state === "connected"}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Connect an MCP client to <Box component="code">/api/mcp</Box> on this site.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
