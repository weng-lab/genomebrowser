"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useRemoteControl } from "../../agent/RemoteControlProvider";

const stateLabels = { off: "Off", connecting: "Connecting…", connected: "Connected" };
const preferenceLabels = {
  loading: "Loading…",
  saving: "Saving…",
  "signed-out": "Sign in to use remote control.",
  unavailable: "Unavailable",
};

export function SettingsView() {
  const { state, preference } = useRemoteControl();
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2">Remote control</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={preference.enabled}
            disabled={preference.status !== "saved"}
            onChange={(event) => preference.setEnabled(event.target.checked)}
          />
        }
        label="Allow agents to control my open session"
      />
      <Typography component="output" variant="body2" sx={{ display: "block" }}>
        {preference.status === "saved" ? stateLabels[state] : preferenceLabels[preference.status]}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Saved for your account. Browsing and saving sessions work either way.
      </Typography>
      {preference.error && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          action={
            preference.status === "unavailable" && (
              <Button color="inherit" size="small" onClick={preference.reload}>
                Retry
              </Button>
            )
          }
        >
          {preference.error}
        </Alert>
      )}
    </Box>
  );
}
