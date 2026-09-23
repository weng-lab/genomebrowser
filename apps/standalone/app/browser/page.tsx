import type { Metadata } from "next";
import { Box } from "@mui/material";
import { SessionNavigation } from "../../features/sessions/SessionNavigation";
import { Browser } from "../../features/browser/Browser";

export const metadata: Metadata = { title: "Browser" };

export default function BrowserPage() {
  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 0 }}>
      <SessionNavigation session={null} />
      <Browser />
    </Box>
  );
}
