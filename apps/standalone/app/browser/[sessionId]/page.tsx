import type { Metadata } from "next";
import { Alert, Box, Button, Container } from "@mui/material";
import { SiteLink } from "@/components/SiteLink";
import { AuthUnavailable } from "@/features/auth/AuthUnavailable";
import { Browser } from "@/features/browser/Browser";
import { getCurrentUserCustomTracks } from "@/features/custom-tracks/queries";
import { RegisterActiveSession } from "@/features/sessions/activeSession";
import { getCurrentUserSession } from "@/features/sessions/queries";

export const metadata: Metadata = { title: "Saved session" };

export default async function SavedSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const result = await getCurrentUserSession(sessionId);
  if (result.status === "auth-unavailable") return <AuthUnavailable />;
  if (result.status === "storage-unavailable") {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Session storage is unavailable, so saved sessions cannot be opened.
        </Alert>
        <Button component={SiteLink} href="/browser" variant="outlined">
          Explore the browser
        </Button>
      </Container>
    );
  }
  const { session } = result;
  const customTracks = await getCurrentUserCustomTracks();
  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 0 }}>
      <RegisterActiveSession
        session={{ id: session.id, name: session.name, ownerId: session.ownerId }}
      />
      <Browser key={session.id} customTracks={customTracks} session={session} />
    </Box>
  );
}
