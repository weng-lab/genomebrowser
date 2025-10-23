import { useEffect } from "react";
import { useLazyQuery } from "@apollo/client";
import { useBrowserStore, useDataStore, useTrackStore } from "../store/BrowserContext";
import { BIGDATA_QUERY, TRANSCRIPT_GENES_QUERY, MOTIF_QUERY } from "../api-legacy/queries";
import { trackFetchers } from "../api/fetchers";

/**
 * Unified data fetcher hook that orchestrates fetching for all tracks
 * This replaces the DataFetcher component with a cleaner hook-based approach
 */
export function useDataFetcher() {
  const tracks = useTrackStore((state) => state.tracks);
  const domain = useBrowserStore((state) => state.domain);
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const setDelta = useBrowserStore((state) => state.setDelta);
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const multiplier = useBrowserStore((state) => state.multiplier);

  const isFetching = useDataStore((state) => state.isFetching);
  const setFetching = useDataStore((state) => state.setFetching);
  const setMultipleTrackData = useDataStore((state) => state.setMultipleTrackData);
  const getTrackData = useDataStore((state) => state.getTrackData);

  // Initialize all query hooks
  const [fetchBigData] = useLazyQuery(BIGDATA_QUERY);
  const [fetchGene] = useLazyQuery(TRANSCRIPT_GENES_QUERY);
  const [fetchMotif] = useLazyQuery(MOTIF_QUERY);

  useEffect(() => {
    // Guard: Don't fetch if already fetching or no tracks
    if (isFetching || tracks.length === 0) return;

    const fetchAll = async () => {
      setFetching(true);

      const expandedDomain = getExpandedDomain();
      const preRenderedWidth = trackWidth * multiplier - 1;

      // Prepare query hooks for fetchers
      const queries = {
        fetchBigData,
        fetchGene,
        fetchMotif,
      };

      // Only set loading state for tracks that don't have data yet
      // This keeps existing data visible while fetching in background
      const loadingUpdates = tracks
        .filter((track) => {
          const existingData = getTrackData(track.id);
          return !existingData || existingData.status === "idle";
        })
        .map((track) => ({ id: track.id, state: { status: "loading" as const } }));

      if (loadingUpdates.length > 0) {
        setMultipleTrackData(loadingUpdates);
      }

      // Fetch all tracks in parallel
      const results = await Promise.allSettled(
        tracks.map(async (track) => {
          // Get the appropriate fetcher for this track type
          const fetcher = trackFetchers[track.trackType];

          if (!fetcher) {
            throw new Error(`No fetcher found for track type: ${track.trackType}`);
          }

          // Fetch data
          const data = await fetcher({
            track,
            domain,
            expandedDomain,
            preRenderedWidth,
            queries,
          });

          return { id: track.id, data };
        })
      );

      // Update all tracks with their results in one batch
      const updates = results.map((result, index) => {
        const trackId = tracks[index].id;
        if (result.status === "fulfilled") {
          return { id: trackId, state: { status: "loaded" as const, data: result.value.data } };
        } else {
          const errorMessage = result.reason instanceof Error ? result.reason.message : "Unknown error";
          return { id: trackId, state: { status: "error" as const, error: errorMessage } };
        }
      });

      setMultipleTrackData(updates);
      setDelta(0);
      setFetching(false);
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.chromosome, domain.start, domain.end, tracks.length]);
}
