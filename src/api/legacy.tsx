import { gql, useLazyQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { TrackType } from "../components/tracks/types";
import { useBrowserStore } from "../store/browserStore";
import { useDataStore } from "../store/dataStore";
import { useTrackStore } from "../store/trackStore";
import { BIGDATA_QUERY, BigRequest } from "./bigRequests";
import { LDRequest, VARIANT_QUERY } from "./ldRequests";
import { MOTIF_QUERY, MotifRect, MotifRequest } from "./motifRequests";
import { TRANSCRIPT_GENES_QUERY, TranscriptRequest } from "./transcriptRequests";
import { ImportanceTrackSequence } from "../components/tracks/importance/types";

function LegacyDataFetcher() {
  const [bigRequests, setBigRequests] = useState<BigRequest[]>();
  const [transcriptRequest, setTranscriptRequest] = useState<TranscriptRequest>();
  const [motifRequest, setMotifRequest] = useState<MotifRequest>();
  const [importanceRequest, setImportanceRequest] = useState<BigRequest[]>();
  const [ldRequest, setLdRequest] = useState<LDRequest>();

  const [fetchBigData, { data: bigData, loading: bigLoading, error: bigError }] = useLazyQuery(BIGDATA_QUERY);
  const [fetchMotif, { data: motifData, loading: motifLoading, error: motifError }] = useLazyQuery(MOTIF_QUERY);
  const [fetchGene, { data: geneData, loading: geneLoading, error: geneError }] = useLazyQuery(TRANSCRIPT_GENES_QUERY);
  const [fetchImportance, { data: ImportanceData, loading: ImportanceLoading, error: ImportanceError }] =
    useLazyQuery(BIGDATA_QUERY);
  const [fetchSnps, { data: snpData, loading: snpLoading, error: snpError }] = useLazyQuery(gql(VARIANT_QUERY));

  const setDelta = useBrowserStore((state) => state.setDelta);
  const tracks = useTrackStore((state) => state.tracks);
  const editTrack = useTrackStore((state) => state.editTrack);
  const currDomain = useBrowserStore((state) => state.domain);
  const setData = useDataStore((state) => state.setDataById);
  const setLoading = useDataStore((state) => state.setLoading);
  const setFetching = useDataStore((state) => state.setFetching);
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const loading = useDataStore((state) => state.loading);

  const domain = useMemo(() => {
    return getExpandedDomain();
  }, [currDomain, getExpandedDomain]);

  useEffect(() => {
    setBigRequests(
      tracks
        .filter((track) => track.trackType === TrackType.BigWig || track.trackType === TrackType.BigBed)
        .map((track) => ({
          url: track.url || "",
          chr1: domain.chromosome,
          start: domain.start,
          end: domain.end,
        })) as BigRequest[]
    );
    const transcriptTrack = tracks.find((track) => track.trackType === TrackType.Transcript);
    if (transcriptTrack) {
      editTrack<TranscriptConfig>(transcriptTrack.id, { refetch: fetchGene });
      setTranscriptRequest({
        chromosome: domain.chromosome,
        assembly: transcriptTrack.assembly,
        start: domain.start,
        end: domain.end,
        version: transcriptTrack.version,
      });
    } else {
      setTranscriptRequest(undefined);
    }
    const motifTrack = tracks.find((track) => track.trackType === TrackType.Motif);
    if (motifTrack) {
      setMotifRequest({
        range: {
          chromosome: domain.chromosome,
          start: domain.start,
          end: domain.end,
        },
        prange: {
          chrom: domain.chromosome,
          chrom_start: domain.start,
          chrom_end: domain.end,
        },
        assembly: motifTrack.assembly,
        consensus_regex: motifTrack.consensusRegex,
        peaks_accession: motifTrack.peaksAccession,
      });
    }
    const importanceTrack = tracks.find((track) => track.trackType === TrackType.Importance);
    if (importanceTrack) {
      const requests: BigRequest[] = [];
      requests.push({
        url: importanceTrack.url || "",
        chr1: domain.chromosome,
        start: domain.start,
        end: domain.end,
      });
      requests.push({
        url: importanceTrack.signalURL,
        chr1: currDomain.chromosome,
        start: currDomain.start,
        end: currDomain.end,
      });
      setImportanceRequest(requests);
    }
    const ldTrack = tracks.find((track) => track.trackType === TrackType.LDTrack);
    if (ldTrack) {
      setLdRequest({
        assembly: ldTrack.assembly,
        coordinates: {
          chromosome: domain.chromosome,
          start: domain.start,
          end: domain.end,
        },
      });
    }
  }, [tracks.length, domain]);

  useEffect(() => {
    if (!bigRequests) return;
    fetchBigData({ variables: { bigRequests: bigRequests } });
    setFetching(true);
  }, [bigRequests]);

  useEffect(() => {
    if (!transcriptRequest) return;
    fetchGene({ variables: transcriptRequest });
    setFetching(true);
  }, [transcriptRequest]);

  useEffect(() => {
    if (!motifRequest) return;
    fetchMotif({ variables: motifRequest });
    setFetching(true);
  }, [motifRequest]);

  useEffect(() => {
    if (!importanceRequest) return;
    fetchImportance({ variables: { bigRequests: importanceRequest } });
    setFetching(true);
  }, [importanceRequest]);

  useEffect(() => {
    if (!ldRequest) return;
    fetchSnps({ variables: ldRequest });
    setFetching(true);
  }, [ldRequest]);

  useEffect(() => {
    if (bigLoading || geneLoading || motifLoading || ImportanceLoading || snpLoading) return;
    let bigIndex = 0;
    tracks.forEach((track) => {
      if (track.trackType === TrackType.BigWig || track.trackType === TrackType.BigBed) {
        if (bigError) {
          setData(track.id, null, bigError);
        } else if (bigData) {
          if (bigData.bigRequests.length === 0) return;
          setData(track.id, bigData.bigRequests[bigIndex++].data, undefined);
        }
      } else if (track.trackType === TrackType.Transcript) {
        if (geneError) {
          setData(track.id, null, geneError);
        } else if (geneData) {
          setData(track.id, geneData.gene, undefined);
        }
      } else if (track.trackType === TrackType.Motif) {
        if (motifError) {
          setData(track.id, null, motifError);
        } else if (motifData) {
          const peakRect = motifData.peaks.peaks.map(
            (peak: any) =>
              ({
                start: peak.chrom_start,
                end: peak.chrom_end,
              } as MotifRect)
          );
          const occurrenceRect = motifData.meme_occurrences.map(
            (occurrence: any) =>
              ({
                start: occurrence.genomic_region.start,
                end: occurrence.genomic_region.end,
                pwm: occurrence.motif.pwm,
              } as MotifRect)
          );
          setData(track.id, { occurrenceRect, peaks: peakRect }, undefined);
        }
      } else if (track.trackType === TrackType.Importance) {
        if (ImportanceError) {
          setData(track.id, null, ImportanceError);
        } else if (ImportanceData) {
          const sequence = ImportanceData.bigRequests[0].data[0] as string;
          const values = ImportanceData.bigRequests[1].data.map((d: any) => d.value);
          const data = { sequence, importance: values } as ImportanceTrackSequence;
          setData(track.id, data, undefined);
        }
      } else if (track.trackType === TrackType.LDTrack) {
        if (snpError) {
          setData(track.id, null, snpError);
        } else if (snpData) {
          const snps = snpData.snpQuery
            .filter((x: any) => x.coordinates)
            .map((x: any) => ({ ...x, domain: x.coordinates }));
          setData(track.id, { snps: snps, ld: [] }, undefined);
        }
      }
    });
    setDelta(0);
    setLoading(false);
    setFetching(false);
  }, [
    bigData,
    geneData,
    motifData,
    ImportanceData,
    bigError,
    geneError,
    motifError,
    ImportanceError,
    snpData,
    snpError,
    loading,
  ]);

  return null;
}
export default LegacyDataFetcher;
