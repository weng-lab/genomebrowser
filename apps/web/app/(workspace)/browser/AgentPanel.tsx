"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRemoteControl, useSessionId } from "../../../browser/BrowserServer";

export function AgentPanel() {
  const { state } = useRemoteControl();
  const sessionId = useSessionId();
  const stateMessages = {
    off: "Remote control is off. Turn it on in Settings.",
    connecting: "Connecting… If this session is open in another tab, close that tab.",
    connected: `Connected. MCP tools called with sessionId "${sessionId}" run in this tab.`,
  };
  return (
    <Box sx={{ p: 2, overflow: "auto" }}>
      <Stack spacing={2}>
        <Typography component="output" variant="body2">
          {stateMessages[state]}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect an MCP client to <Box component="code">/mcp</Box> on this site.
        </Typography>
      </Stack>
    </Box>
  );
}
