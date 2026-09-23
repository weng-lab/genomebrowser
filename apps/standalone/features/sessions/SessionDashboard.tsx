import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import { SiteLink } from "../site/SiteLink";
import type { SessionListResult } from "./types";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { CreateSessionButton } from "./CreateSessionButton";
import { assemblies } from "../browser/assembly";

export function SessionDashboard({ result }: { result: SessionListResult }) {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h1" sx={{ fontSize: "2rem" }}>
          Your sessions
        </Typography>
        {result.status === "ready" && (
          <Box>
            <CreateSessionButton
              assemblies={assemblies.map(({ definition, label }) => ({ id: definition.id, label }))}
              disabled={result.sessions.length >= 5}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {result.sessions.length} of 5 sessions. Delete a session to make room when the limit
              is reached.
            </Typography>
          </Box>
        )}
        {result.status === "storage-unavailable" && (
          <Alert severity="info">
            Session storage is unavailable. You can explore the browser, but your work will not be
            saved to your account.
          </Alert>
        )}
        {result.status === "error" && (
          <Alert severity="error">
            Your sessions could not be loaded. Please reload to try again.
          </Alert>
        )}
        {result.status === "ready" &&
          (result.sessions.length === 0 ? (
            <Typography color="text.secondary">You have no saved sessions yet.</Typography>
          ) : (
            <Stack component="ul" spacing={2} sx={{ m: 0, p: 0, listStyle: "none" }}>
              {result.sessions.map((session) => (
                <Box
                  component="li"
                  key={session.id}
                  sx={{ borderBottom: 1, borderColor: "divider", pb: 2 }}
                >
                  <Typography component="h2" variant="h6">
                    {session.name || "Untitled session"}
                  </Typography>
                  <Typography color="text.secondary">
                    {session.assemblyId} · {session.region.chromosome}:{session.region.start}–
                    {session.region.end} · {session.trackCount} tracks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated <time dateTime={session.updatedAt}>{session.updatedAt}</time>
                  </Typography>
                  <Button component={SiteLink} href={`/browser/${session.id}`} size="small">
                    Open session
                  </Button>
                  <DeleteSessionButton id={session.id} name={session.name} />
                </Box>
              ))}
            </Stack>
          ))}
        <Box>
          <Button component={SiteLink} href="/browser" variant="outlined">
            Explore the browser
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
