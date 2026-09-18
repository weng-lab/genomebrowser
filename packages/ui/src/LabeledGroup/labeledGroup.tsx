import type { ReactNode } from "react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";

export type LabeledGroupProps = {
  title: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

export function LabeledGroup({ title, children, sx = [] }: LabeledGroupProps) {
  return (
    <Box
      component="fieldset"
      sx={[
        {
          m: 0,
          minWidth: 0,
          px: 1.25,
          pb: 1,
          pt: 0.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          flex: "0 1 auto",
          maxWidth: "100%",
          boxSizing: "border-box",
          "& button": { textTransform: "none" },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography component="legend" variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
