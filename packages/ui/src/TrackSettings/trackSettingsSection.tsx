import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type TrackSettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function TrackSettingsSection({ title, children }: TrackSettingsSectionProps) {
  return (
    <Box
      component="fieldset"
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        display: "grid",
        gap: 1.25,
        m: 0,
        mb: 0,
        minWidth: 0,
        px: 1.25,
        pb: 1.25,
      }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ px: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
