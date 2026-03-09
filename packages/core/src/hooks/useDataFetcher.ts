import { useEffect, useMemo } from "react";
import { useLazyQuery } from "@apollo/client";
import { useBrowserStore, useDataStore, useTrackStore } from "../store/BrowserContext";
import { BIGDATA_QUERY, TRANSCRIPT_GENES_QUERY, MOTIF_QUERY } from "../api/queries";
import type { Track } from "../components/tracks/types";
import type { MotifTrack } from "../components/tracks/motif/definition";
import type { TranscriptTrack } from "../components/tracks/transcript/definition";

function getTrackFetchKey(track: Track) {
  switch (track.definition.type) {
    case "bigwig":
    case "bigbed":
      return `${track.id}:${track.definition.type}:${(track as { url?: string }).url ?? ""}`;
    case "transcript": {
      const transcriptTrack = track as TranscriptTrack;
      return `${track.id}:${track.definition.type}:${transcriptTrack.assembly}:${transcriptTrack.version}`;
    }
    case "motif": {
      const motifTrack = track as MotifTrack;
      return `${track.id}:${track.definition.type}:${motifTrack.assembly}:${motifTrack.peaksAccession}:${motifTrack.consensusRegex}`;
    }
    default:
      return `${track.id}:${track.definition.type}`;
  }
}

/**
 * Unified data fetcher hook that orchestrates fetching for all tracks.
 * Each track's definition provides its own fetcher function.
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

  const [fetchBigData] = useLazyQuery(BIGDATA_QUERY);
  const [fetchGene] = useLazyQuery(TRANSCRIPT_GENES_QUERY);
  const [fetchMotif] = useLazyQuery(MOTIF_QUERY);

  const trackFetchKey = useMemo(() => tracks.map(getTrackFetchKey).join("|"), [tracks]);

  useEffect(() => {
    if (isFetching || tracks.length === 0) return;

    const fetchAll = async () => {
      setFetching(true);

      const expandedDomain = getExpandedDomain();
      const preRenderedWidth = trackWidth * multiplier - 1;

      const queries = {
        fetchBigData,
        fetchGene,
        fetchMotif,
        getTrackData,
      };

      // Initialize tracks that don't have data yet
      const initUpdates = tracks
        .filter((track) => !getTrackData(track.id))
        .map((track) => ({ id: track.id, state: { data: null, error: null } }));

      if (initUpdates.length > 0) {
        setMultipleTrackData(initUpdates);
      }

      // Fetch all tracks in parallel using each track's definition fetcher
      const results = await Promise.allSettled(
        tracks.map(async (track) => {
          const fetcher = track.definition.fetcher;
          const result = await fetcher({
            track,
            domain,
            expandedDomain,
            preRenderedWidth,
            queries,
          });
          return { id: track.id, ...result };
        })
      );

      const updates = results.map((result, index) => {
        const trackId = tracks[index].id;
        if (result.status === "fulfilled") {
          return {
            id: trackId,
            state: {
              data: result.value.data,
              error: result.value.error,
            },
          };
        }
        const errorMessage = result.reason instanceof Error ? result.reason.message : "Unknown error";
        return {
          id: trackId,
          state: {
            data: null,
            error: errorMessage,
          },
        };
      });

      setMultipleTrackData(updates);
      setDelta(0);
      setFetching(false);
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.chromosome, domain.start, domain.end, trackFetchKey]);
}
