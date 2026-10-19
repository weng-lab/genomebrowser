"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRemoteControl } from "../../../commands/RemoteControl";
import { useSession } from "../../../sessions/SessionProvider";

export function AgentPanel() {
  const { state, enabled } = useRemoteControl();
  const sessionId = useSession((session) => session.active?.id);
  // The session updates its state whenever the signal aborts, so this stays current.
  const ended = useSession((session) => session.active?.signal.aborted);
  let message = "Remote control is off. Turn it on in Settings.";
  if (enabled && !sessionId) message = "Open a session to connect it to agents.";
  else if (enabled && ended)
    message = "This session's changes can no longer be saved, so agents cannot control it.";
  else if (enabled && state === "connected")
    message = `Connected. MCP tools called with sessionId "${sessionId}" run in this tab.`;
  else if (enabled) message = "Connecting… If this session is open in another tab, close that tab.";
  return (
    <Box sx={{ p: 2, overflow: "auto" }}>
      <Stack spacing={2}>
        <Typography component="output" variant="body2">
          {message}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect an MCP client to <Box component="code">/mcp</Box> on this site.
        </Typography>
      </Stack>
    </Box>
  );
}
