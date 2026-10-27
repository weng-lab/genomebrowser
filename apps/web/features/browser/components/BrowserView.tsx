"use client";

import { useState } from "react";
import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import {
  DownloadImageDialog,
  InteractionControls,
  ManagementControls,
  NavigationControls,
  RegionControls,
} from "@weng-lab/genomebrowser-ui";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useSession } from "../../sessions/SessionProvider";
import { SaveStatus } from "../../sessions/components/SaveStatus";

/** The open session's browser, or why none is shown. `sessionId` is the session in the URL. */
export function BrowserView({ sessionId }: { sessionId?: string }) {
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  return (
    <Box>
      <SaveStatus />
      <SessionAlert />
      {stores ? <BrowserContent key={id} stores={stores} /> : <NoSession sessionId={sessionId} />}
    </Box>
  );
}

function SessionAlert() {
  const error = useSession((session) => session.error);
  const unsaveable = useSession(
    (session) => session.saveStatus === "failed" || session.saveStatus === "conflict",
  );
  const conflict = useSession((session) => session.saveStatus === "conflict");
  const overwrite = useSession((session) => session.overwrite);
  const close = useSession((session) => session.close);
  if (!error && !unsaveable) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
      {error && (
        <Typography role="alert" variant="body2" color="error">
          {error}
        </Typography>
      )}
      {conflict && (
        <Button size="small" color="error" onClick={() => void overwrite()}>
          Save over it
        </Button>
      )}
      {unsaveable && (
        <Button size="small" color="error" onClick={() => void close({ discard: true })}>
          Close without saving
        </Button>
      )}
    </Box>
  );
}

function NoSession({ sessionId }: { sessionId?: string }) {
  const status = useSession((session) => session.status);
  const opening = useSession((session) => session.pending?.operation === "open");
  const failed = useSession((session) => session.error !== undefined);
  const open = useSession((session) => session.open);
  let message = "Open a saved session or create one in the Sessions panel.";
  if (status === "signed-out") message = "Sign in to open and save sessions.";
  else if (opening || (sessionId && !failed)) message = "Opening session…";
  else if (status === "loading") message = "Loading sessions…";
  return (
    <Box component="output" sx={{ display: "block", p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {sessionId && failed && !opening && status !== "signed-out" && (
        <Button size="small" sx={{ mt: 1 }} onClick={() => void open(sessionId)}>
          Try again
        </Button>
      )}
    </Box>
  );
}

function BrowserContent({ stores }: { stores: GenomeBrowserStores }) {
  const { useBrowserStore, useTrackStore } = stores;
  const [downloadOpen, setDownloadOpen] = useState(false);
  return (
    <>
      <Box
        role="group"
        aria-label="Genome browser controls"
        sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 1, mb: 2 }}
      >
        <RegionControls
          browserStore={useBrowserStore}
          search={{
            assembly: "GRCh38",
            graphqlUrl: "/api/screen-graphql",
            queries: ["Coordinate"],
          }}
        />
        <NavigationControls browserStore={useBrowserStore} />
        <InteractionControls browserStore={useBrowserStore} />
        <ManagementControls onDownloadImage={() => setDownloadOpen(true)} />
      </Box>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      <DownloadImageDialog
        browserStore={useBrowserStore}
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
      />
    </>
  );
}
