"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LicenseInfo } from "@mui/x-license";
import { TrackSelect, type TrackSelectTrackIdResolver } from "@weng-lab/genomebrowser-ui";
import type { TrackCollection } from "@weng-lab/genomebrowser";
import { useBrowserSession } from "../../../browser/BrowserSession";
import {
  useSessionId,
  useSessionLoading,
  useSessionSaveState,
} from "../../../browser/BrowserServer";

const licenseKey = process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY;
if (licenseKey) LicenseInfo.setLicenseKey(licenseKey);

export function CollectionsView({ collection }: { collection: TrackCollection }) {
  const loading = useSessionLoading();
  return (
    <Box>
      <Typography component="h2" variant="h6">
        {collection.label ?? collection.id}
      </Typography>
      {collection.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {collection.description}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
        {collection.assembly} · {collection.tracks.length.toLocaleString("en-US")} tracks
      </Typography>
      {loading ? <CollectionSessionLoading /> : <CollectionTrackPicker collection={collection} />}
    </Box>
  );
}

function CollectionSessionLoading() {
  const status = useSessionSaveState();
  return (
    <Typography
      role="status"
      variant="body2"
      color={status === "load-error" ? "error" : "text.secondary"}
    >
      {status === "load-error"
        ? "Could not load the browser session. Retrying before tracks can be added."
        : "Loading the browser session before adding tracks..."}
    </Typography>
  );
}

function CollectionTrackPicker({ collection }: { collection: TrackCollection }) {
  const { useTrackStore } = useBrowserSession();
  const sessionId = useSessionId();
  const router = useRouter();
  const trackCollections = useMemo(() => [collection], [collection]);
  const resolveCollectionTrackId: TrackSelectTrackIdResolver = useCallback(
    (track) => {
      const isDefault =
        (track.base.id === "genes" && track.type === "gene") ||
        (track.base.id === "ccres" && track.type === "ccre-bigbed");
      if (!isDefault || typeof track.config.url !== "string") return;
      const matches = collection.tracks.filter(
        (entry) => entry.type === track.type && entry.config.url === track.config.url,
      );
      if (matches.length === 1) return `${collection.id}::${matches[0].base.id}`;
    },
    [collection],
  );
  return (
    <TrackSelect
      variant="inline"
      open
      title={`Select tracks from ${collection.label ?? collection.id}`}
      trackCollections={trackCollections}
      useTrackStore={useTrackStore}
      resolveCollectionTrackId={resolveCollectionTrackId}
      onClose={() => router.push(`/browser/${sessionId}`)}
    />
  );
}
