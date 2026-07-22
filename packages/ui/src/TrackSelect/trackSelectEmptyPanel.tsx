import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { trackSelectPanelHeight } from "./trackSelectConstants";

export function TrackSelectEmptyPanel({ children }: { children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ height: trackSelectPanelHeight, borderWidth: 2 }}>
      <Typography color="text.secondary" sx={{ p: 3 }}>
        {children}
      </Typography>
    </Paper>
  );
}
