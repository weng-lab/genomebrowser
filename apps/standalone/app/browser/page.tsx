import type { Metadata } from "next";
import { Box } from "@mui/material";
import { Browser } from "@/features/browser/Browser";
import { getCurrentUserCustomTracks } from "@/features/custom-tracks/queries";
import { RegisterActiveSession } from "@/features/sessions/activeSession";

export const metadata: Metadata = { title: "Browser" };

export default async function BrowserPage() {
  const customTracks = await getCurrentUserCustomTracks();
  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 0 }}>
      {/* Opening the guest browser leaves the active session. */}
      <RegisterActiveSession session={null} />
      <Browser customTracks={customTracks} />
    </Box>
  );
}
