import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type StatusMessageProps = {
  /** Why there is nothing to show, or what is loading. */
  message: string;
  /** `error` when the content could not be loaded. Defaults to `neutral`. */
  tone?: "neutral" | "error";
  /** A button below the message, such as "Try again". */
  action?: ReactNode;
};

/**
 * A line of status where content would be, such as while it loads, after it fails to, or
 * before a session is open. Screen readers announce changes to it politely. The caller places it, with
 * padding that lines it up with the content it replaces.
 */
export function StatusMessage({ message, tone = "neutral", action }: StatusMessageProps) {
  return (
    <Box component="output" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="body2" color={tone === "error" ? "error" : "text.secondary"}>
        {message}
      </Typography>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
