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
        gap: 1.5,
        m: 0,
        mb: 1.5,
        minWidth: 0,
        px: 1.5,
        pb: 1.5,
      }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ px: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
