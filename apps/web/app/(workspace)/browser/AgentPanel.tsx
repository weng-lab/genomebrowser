"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { commandReplySchema } from "@weng-lab/browser-server/protocol";
import { formatDisplayRegion, parseDisplayRegion } from "@weng-lab/genomebrowser";
import { useCommandConnection } from "../../../browser/BrowserCommands";

type Feedback = { status: "idle" | "pending" } | { status: "error" | "success"; message: string };

export function AgentPanel() {
  const connection = useCommandConnection();
  const [regionText, setRegionText] = useState("chr12:53,372,923-53,423,700");
  const [feedback, setFeedback] = useState<Feedback>({ status: "idle" });
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function setRegion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connection.status !== "connected" || request.current) return;

    const controller = new AbortController();
    request.current = controller;
    try {
      const region = parseDisplayRegion(regionText);
      setFeedback({ status: "pending" });
      const response = await fetch(`/api/browser/clients/${connection.clientId}/region`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(region),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        const rejection = commandReplySchema.safeParse(payload);
        if (rejection.success && !rejection.data.result.ok) {
          throw new Error(rejection.data.result.error);
        }
        const error =
          typeof payload === "object" && payload !== null && "error" in payload
            ? payload.error
            : undefined;
        throw new Error(typeof error === "string" ? error : "The server could not set the region.");
      }
      const reply = commandReplySchema.safeParse(await response.json());
      if (!reply.success) throw new Error("The server returned an invalid command response.");
      if (!reply.data.result.ok) throw new Error(reply.data.result.error);
      if (!controller.signal.aborted) {
        setFeedback({
          status: "success",
          message: `Region set to ${formatDisplayRegion(reply.data.result.region)}${reply.data.result.clamped ? " (adjusted to the chromosome bounds)" : ""}.`,
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setFeedback({
          status: "error",
          message: error instanceof Error ? error.message : "Could not set the region. Try again.",
        });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  const pending = feedback.status === "pending";

  return (
    <Box sx={{ p: 2, overflow: "auto" }}>
      <Stack component="form" onSubmit={setRegion} spacing={2}>
        <Typography variant="body2">Commands go through the server to this browser.</Typography>
        <Typography component="output" variant="body2" color="text.secondary">
          {connection.status === "connected"
            ? "Connected"
            : connection.status === "connecting"
              ? "Connecting to server…"
              : "Server connection disabled"}
        </Typography>
        <TextField
          label="Region"
          size="small"
          value={regionText}
          onChange={(event) => {
            setRegionText(event.target.value);
            setFeedback({ status: "idle" });
          }}
          disabled={pending}
          helperText="One-based coordinates, for example chr12:53,372,923-53,423,700"
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          disabled={connection.status !== "connected" || pending}
        >
          {pending ? "Setting region…" : "Set region"}
        </Button>
        {(feedback.status === "error" || feedback.status === "success") && (
          <Alert severity={feedback.status}>{feedback.message}</Alert>
        )}
      </Stack>
    </Box>
  );
}
