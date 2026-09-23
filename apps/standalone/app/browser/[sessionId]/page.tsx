import { getCurrentUserCustomTracks } from "../../../features/custom-tracks/queries";
import type { Metadata } from "next";
import { Box } from "@mui/material";
import { AuthUnavailable } from "../../../features/auth/AuthUnavailable";
import { SessionNavigation } from "../../../features/sessions/SessionNavigation";
import { Browser } from "../../../features/browser/Browser";
import { SessionDashboard } from "../../../features/sessions/SessionDashboard";
import { getCurrentUserSession } from "../../../features/sessions/queries";

export const metadata: Metadata = { title: "Saved session" };

export default async function SavedSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const result = await getCurrentUserSession(sessionId);
  if (result.status === "auth-unavailable") return <AuthUnavailable />;
  if (result.status === "storage-unavailable") return <SessionDashboard result={result} />;
  const { session } = result;
  const customTracks = await getCurrentUserCustomTracks();
  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 0 }}>
      <SessionNavigation
        session={{ id: session.id, name: session.name, ownerId: session.ownerId }}
      />
      <Browser
        key={session.id}
        initialCustomTracks={customTracks}
        initialSnapshot={session.snapshot}
        initialSession={{ id: session.id, name: session.name, revision: session.revision }}
      />
    </Box>
  );
}
