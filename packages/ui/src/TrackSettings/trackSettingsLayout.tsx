import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export type TrackSettingsLayoutProps = {
  children: ReactNode;
};

/** Shared root spacing for multi-section track settings forms. */
export function TrackSettingsLayout({ children }: TrackSettingsLayoutProps) {
  return <Box sx={{ display: "grid", gap: "12px", minWidth: 0 }}>{children}</Box>;
}
