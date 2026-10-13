"use client";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useRemoteControl } from "../../../browser/BrowserServer";

const stateLabels = { off: "Off", connecting: "Connecting…", connected: "Connected" };

export function SettingsView() {
  const remote = useRemoteControl();
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2">Remote control</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={remote.enabled}
            onChange={(event) => remote.setEnabled(event.target.checked)}
          />
        }
        label="Allow agents to control this tab"
      />
      <Typography component="output" variant="body2" sx={{ display: "block" }}>
        {stateLabels[remote.state]}
      </Typography>
    </Box>
  );
}
