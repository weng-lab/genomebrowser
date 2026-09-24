import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { SiteLink } from "@/components/SiteLink";
import { CustomTrackList } from "@/features/custom-tracks/CustomTrackList";
import type { CustomTracksResult } from "@/features/custom-tracks/types";
import { SessionList } from "@/features/sessions/SessionList";
import type { SessionListResult } from "@/features/sessions/types";
import { DashboardTabs } from "./DashboardTabs";

export function Dashboard({
  sessions,
  customTracks,
}: {
  sessions: SessionListResult;
  customTracks: CustomTracksResult;
}) {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h1" sx={{ fontSize: "2rem" }}>
          Dashboard
        </Typography>
        <DashboardTabs
          sessions={<SessionList result={sessions} />}
          collections={<CustomTrackList result={customTracks} />}
        />
        <Box>
          <Button component={SiteLink} href="/browser" variant="outlined">
            Explore the browser
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
