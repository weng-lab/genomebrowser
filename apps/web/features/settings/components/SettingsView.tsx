"use client";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import { useRemoteControl } from "../../agent/RemoteControl";

const stateLabels = {
  off: "Off",
  connecting: "Connecting…",
  connected: "Connected",
  superseded: "Agent control moved to another tab",
};

export function SettingsView() {
  const remote = useRemoteControl();
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2">Remote control</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={remote.enabled}
            disabled={remote.pending}
            onChange={(event) => remote.setEnabled(event.target.checked)}
          />
        }
        label="Allow agents to control my sessions"
      />
      <Typography component="output" variant="body2" sx={{ display: "block" }}>
        {stateLabels[remote.state]}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Saved for your account. New accounts start with remote control enabled.
      </Typography>
      {remote.error && <Alert severity="error">{remote.error}</Alert>}
    </Box>
  );
}
