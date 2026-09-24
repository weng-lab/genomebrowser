import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { assemblies } from "@/features/assemblies/assemblies";
import { SiteLink } from "@/components/SiteLink";
import { CreateSessionButton } from "./components/CreateSessionButton";
import { DeleteSessionButton } from "./components/DeleteSessionButton";
import { SESSION_LIMIT } from "./rules";
import type { SessionListResult } from "./types";

const assemblyOptions = assemblies.map(({ definition, label }) => ({ id: definition.id, label }));

/** The signed-in account's saved sessions, with creation and deletion. */
export function SessionList({ result }: { result: SessionListResult }) {
  if (result.status === "storage-unavailable") {
    return (
      <Alert severity="info">
        Session storage is unavailable. You can explore the browser, but your work will not be saved
        to your account.
      </Alert>
    );
  }
  if (result.status === "error") {
    return (
      <Alert severity="error">Dashboard could not be loaded. Please reload to try again.</Alert>
    );
  }
  const { sessions } = result;
  return (
    <Stack spacing={3}>
      <Box>
        <CreateSessionButton
          assemblies={assemblyOptions}
          disabled={sessions.length >= SESSION_LIMIT}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {sessions.length} of {SESSION_LIMIT} sessions. Delete a session to make room when the
          limit is reached.
        </Typography>
      </Box>
      {sessions.length === 0 ? (
        <Typography color="text.secondary">You have no saved sessions yet.</Typography>
      ) : (
        <Stack component="ul" spacing={2} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {sessions.map((session) => (
            <Box
              component="li"
              key={session.id}
              sx={{ borderBottom: 1, borderColor: "divider", pb: 2 }}
            >
              <Typography component="h2" variant="h6">
                {session.name}
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
      )}
    </Stack>
  );
}
