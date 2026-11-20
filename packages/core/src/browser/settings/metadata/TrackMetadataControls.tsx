import { useState } from "react";
import { useGenomeBrowser, useTrackMutationGate } from "../../state/browserContextState";
import { TrackMetadataEditor } from "./TrackMetadataEditor";
import {
  metadataFromRows,
  metadataRows,
  sameMetadata,
  type TrackMetadataRow,
} from "./metadataRows";

/**
 * The settings modal's metadata section for one track. Each edit that leaves every field
 * valid replaces the track's metadata at once, as other settings apply. While a field isn't
 * valid, the track keeps its last valid metadata.
 */
export function TrackMetadataControls({ trackId }: { trackId: string }) {
  const { useTrackStore } = useGenomeBrowser();
  const metadata = useTrackStore((state) => state.getTrack(trackId)?.metadata);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const { isInteractionBlocked, runTrackMutation } = useTrackMutationGate();
  // The stored metadata the rows were built from or last saved. When the store changes
  // another way, such as through an agent command, the rows are rebuilt from it and edits
  // that weren't valid yet are dropped.
  const [shown, setShown] = useState(metadata);
  const [rows, setRows] = useState(() => metadataRows(metadata));
  if (!sameMetadata(metadata, shown)) {
    setShown(metadata);
    setRows(metadataRows(metadata));
  }

  const change = (next: TrackMetadataRow[]) => {
    setRows(next);
    const result = metadataFromRows(next);
    if (!result.ok || sameMetadata(result.metadata, metadata)) return;
    setShown(result.metadata);
    runTrackMutation(() => updateTrack(trackId, { metadata: result.metadata }));
  };

  return <TrackMetadataEditor value={rows} onChange={change} disabled={isInteractionBlocked} />;
}
