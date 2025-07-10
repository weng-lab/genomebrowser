"use client";
import { useEffect } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { TrackType } from "../components/tracks/types";

import { useBrowserStore } from "../store/browserStore";
import { useDataStore } from "../store/dataStore";
import { useTrackStore } from "../store/trackStore";

import { BIGDATA_QUERY, MOTIF_QUERY, TRANSCRIPT_GENES_QUERY, VARIANT_QUERY } from "./queries";
import { buildAllRequests } from "./requestBuilder";
import { executeAllQueries } from "./queryExecutor";
import { processAllResults } from "./resultsProcessor";

function DataFetcher() {
  const [fetchBigData, { data: bigData, loading: bigLoading, error: bigError }] = useLazyQuery(BIGDATA_QUERY);
  const [fetchMotif, { data: motifData, loading: motifLoading, error: motifError }] = useLazyQuery(MOTIF_QUERY);
  const [fetchGene, { data: geneData, loading: geneLoading, error: geneError }] = useLazyQuery(TRANSCRIPT_GENES_QUERY);
  const [fetchImportance, { data: importanceData, loading: importanceLoading, error: importanceError }] =
    useLazyQuery(BIGDATA_QUERY);
  const [fetchBulkBed, { data: bulkBedData, loading: bulkBedLoading, error: bulkBedError }] =
    useLazyQuery(BIGDATA_QUERY);
  const [fetchSnps, { data: snpData, loading: snpLoading, error: snpError }] = useLazyQuery(gql(VARIANT_QUERY));

  const tracks = useTrackStore((state) => state.tracks);
  const editTrack = useTrackStore((state) => state.editTrack);
  const domain = useBrowserStore((state) => state.domain);
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const setDelta = useBrowserStore((state) => state.setDelta);

  const shouldFetch = useDataStore((state) => state.shouldFetch);
  const setData = useDataStore((state) => state.setDataById);
  const setLoading = useDataStore((state) => state.setLoading);
  const setFetching = useDataStore((state) => state.setFetching);
  const setShouldFetch = useDataStore((state) => state.setShouldFetch);

  useEffect(() => {
    if (!shouldFetch || tracks.length === 0) return;

    // Loading guard to prevent concurrent fetching
    if (bigLoading || geneLoading || motifLoading || importanceLoading || bulkBedLoading || snpLoading) {
      return;
    }

    const fetchAllData = async () => {
      setFetching(true);

      // Build all requests using utility functions
      const requests = buildAllRequests(tracks, getExpandedDomain(), domain);

      // Set up transcript refetch function if needed
      const transcriptTrack = tracks.find((track) => track.trackType === TrackType.Transcript);
      if (transcriptTrack && requests.transcriptRequest) {
        editTrack<TranscriptConfig>(transcriptTrack.id, { refetch: fetchGene });
      }

      // Execute all queries using utility function
      await executeAllQueries(requests, {
        fetchBigData,
        fetchGene,
        fetchMotif,
        fetchImportance,
        fetchBulkBed,
        fetchSnps,
      });

      setShouldFetch(false);
    };

    fetchAllData().catch((error) => {
      console.error("Error fetching data:", error);
      setShouldFetch(false);
    });
  }, [shouldFetch]);

  // Trigger fetch on domain or track changes
  useEffect(() => {
    if (tracks.length > 0) {
      setShouldFetch(true);
    }
  }, [domain.chromosome, domain.start, domain.end, tracks.length]);

  // Simple results processing using utility function
  useEffect(() => {
    if (bigLoading || geneLoading || motifLoading || importanceLoading || bulkBedLoading || snpLoading) return;

    const results = processAllResults(tracks, {
      bigData,
      geneData,
      motifData,
      importanceData,
      bulkBedData,
      snpData,
      bigError,
      geneError,
      motifError,
      importanceError,
      bulkBedError,
      snpError,
    });

    // Update data store with all processed results
    results.forEach((result) => {
      setData(result.trackId, result.data, result.error);
    });

    setDelta(0);
    setLoading(false);
    setFetching(false);
  }, [
    bigData,
    geneData,
    motifData,
    importanceData,
    bulkBedData,
    snpData,
    bigError,
    geneError,
    motifError,
    importanceError,
    bulkBedError,
    snpError,
    bigLoading,
    geneLoading,
    motifLoading,
    importanceLoading,
    bulkBedLoading,
    snpLoading,
    setData,
    setDelta,
    setLoading,
    setFetching,
  ]);

  return null;
}

export default DataFetcher;
