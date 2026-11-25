"use client";

import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useAgentControl } from "../RemoteControlProvider";

/**
 * Part of the page that changes the open session, such as the browser or its
 * tools. While the agent holds control, it is tinted and inert, so neither
 * pointer, keyboard, nor focus can change the session under the agent, and
 * `banner` offers the way out: Stop for a run of the agent panel, which it
 * ends, and Take back control for an agent this tab cannot stop, which keeps
 * working. Reading it, as by scrolling the page, still works.
 */
export function AgentControlBoundary({
  children,
  banner = false,
  sx,
}: {
  children: ReactNode;
  /** Show the "agent has control" notice and its way out above this part. */
  banner?: boolean;
  /** Layout for the box around `children`, such as letting it grow in a flex column. */
  sx?: SxProps<Theme>;
}) {
  const { held, stops, control } = useAgentControl();
  return (
    <>
      {held && banner && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: "action.selected",
          }}
        >
          <Typography component="output" variant="body2" sx={{ flex: 1 }}>
            {stops
              ? "The agent has control of the browser while it works."
              : "An agent has control of the browser. Taking it back does not stop the agent."}
          </Typography>
          <Button size="small" onClick={() => control.stop()}>
            {stops ? "Stop" : "Take back control"}
          </Button>
        </Box>
      )}
      <Box
        inert={held}
        aria-busy={held || undefined}
        sx={[
          { position: "relative", transition: "opacity 150ms" },
          held && { opacity: 0.6 },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {children}
      </Box>
    </>
  );
}
