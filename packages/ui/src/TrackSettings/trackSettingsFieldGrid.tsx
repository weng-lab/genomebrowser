import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export type TrackSettingsFieldGridProps = {
  children: ReactNode;
};

export function TrackSettingsFieldGrid({ children }: TrackSettingsFieldGridProps) {
  return (
    <Box
      sx={{
        alignItems: "start",
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
      }}
    >
      {children}
    </Box>
  );
}
