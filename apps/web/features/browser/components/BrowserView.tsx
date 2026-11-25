"use client";

import { useState } from "react";
import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { ControlToolbar, DownloadImageDialog, TrackSortDialog } from "@weng-lab/genomebrowser-ui";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import SortIcon from "@mui/icons-material/Sort";
import { useSession } from "../../sessions/SessionProvider";
import { useBrowserSvgRef } from "../BrowserSvg";
import { getTrackSortOptions } from "../trackSort";
import { AgentControlBoundary } from "../../agent/components/AgentControlBoundary";
import { useAgentControl } from "../../agent/RemoteControlProvider";
import { AddTracksDialog } from "./AddTracksDialog";

/** The open session's browser, or why none is shown. `sessionId` is the session in the URL. */
export function BrowserView({ sessionId }: { sessionId?: string }) {
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  return (
    <Box>
      <SessionAlert />
      {stores ? (
        <AgentControlBoundary banner>
          <BrowserContent key={id} stores={stores} />
        </AgentControlBoundary>
      ) : (
        <NoSession sessionId={sessionId} />
      )}
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
  let message = "Open a recent session or create one from the menu beside the title.";
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
  const svgRef = useBrowserSvgRef();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // Dialogs and the search list render outside the inert browser, so taking
  // control closes the ones that change the session and resets the search.
  const { held } = useAgentControl();
  const [heldBefore, setHeldBefore] = useState(held);
  if (held !== heldBefore) {
    setHeldBefore(held);
    if (held) {
      setSortOpen(false);
      setAddOpen(false);
    }
  }
  // Read the tracks when Sort is clicked rather than subscribing, so track changes
  // do not re-render the controls. A sort is a one-time operation.
  const [sortOptions, setSortOptions] = useState(() =>
    getTrackSortOptions(useTrackStore.getState()),
  );
  const openSort = () => {
    setSortOptions(getTrackSortOptions(useTrackStore.getState()));
    setSortOpen(true);
  };

  return (
    <>
      <Box key={held ? "held" : "free"} sx={{ mb: 2 }}>
        <ControlToolbar
          browserStore={useBrowserStore}
          search={{
            assembly: "GRCh38",
            graphqlUrl: "/api/screen-graphql",
            queries: ["Coordinate"],
          }}
          managementActions={
            <>
              <Button size="small" startIcon={<SortIcon />} onClick={openSort}>
                Sort tracks
              </Button>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => setDownloadOpen(true)}
              >
                Download
              </Button>
              {/* A temporary placement (#368), until the collections design settles. */}
              <Button size="small" startIcon={<PlaylistAddIcon />} onClick={() => setAddOpen(true)}>
                Add tracks
              </Button>
            </>
          }
        />
      </Box>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} svgRef={svgRef} />
      <DownloadImageDialog
        browserStore={useBrowserStore}
        svgRef={svgRef}
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
      />
      <AddTracksDialog
        trackStore={useTrackStore}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <TrackSortDialog
        trackStore={useTrackStore}
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        options={sortOptions}
      />
    </>
  );
}
