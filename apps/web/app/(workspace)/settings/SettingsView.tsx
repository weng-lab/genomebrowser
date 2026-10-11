"use client";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useCommandConnection } from "../../../commands/BrowserCommands";

export function SettingsView() {
  const connection = useCommandConnection();
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2">Remote control</Typography>
      <Typography component="output" variant="body2" sx={{ display: "block" }}>
        {connection.status === "connected"
          ? "Connected"
          : connection.status === "disabled"
            ? "Disabled"
            : "Waiting for server"}
      </Typography>
      {connection.status === "connected" && (
        <Typography variant="body2" sx={{ mt: 1, overflowWrap: "anywhere" }}>
          Browser connection: <Box component="code">{connection.clientId}</Box>
        </Typography>
      )}
    </Box>
  );
}
