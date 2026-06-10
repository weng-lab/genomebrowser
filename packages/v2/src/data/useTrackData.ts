import { useEffect, useMemo, useRef, useState } from "react";
import type { createModuleRegistry } from "../modules/registry";
import type { TrackConfigBase } from "../modules/types";
import type { BrowserRegion } from "../utils/region";
import { createFetchSignature } from "./fetchOnChange";
import { fetchTrackData } from "./fetchTrackData";
import type { DataResult, DataState, DataStoreInstance } from "./types";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function useTrackData({
  useDataStore,
  registry,
  tracks,
  region,
  onSettled,
}: {
  useDataStore: DataStoreInstance;
  registry: ModuleRegistry;
  tracks: TrackConfigBase[];
  region: BrowserRegion;
  onSettled?: () => void;
}) {
  const completedData = useDataStore((state) => state.data);
  const setData = useDataStore((state) => state.setData);
  const [fetchingTrackIds, setFetchingTrackIds] = useState<Set<string>>(() => new Set());
  const previousRegionSignature = useRef<string | null>(null);
  const previousFetchSignatures = useRef<Record<string, string>>({});
  const onSettledRef = useRef(onSettled);
  const regionSignature = createRegionSignature(region);

  onSettledRef.current = onSettled;

  useEffect(() => {
    let active = true;
    const currentTrackIds = new Set(tracks.map((track) => track.id));
    const currentFetchSignatures = createTrackFetchSignatures(registry, tracks);
    const prunedData = pruneData(useDataStore.getState().data, currentTrackIds);
    const removedTracks =
      Object.keys(useDataStore.getState().data).length !== Object.keys(prunedData).length;

    if (removedTracks) setData(prunedData);

    const isInitialFetch = previousRegionSignature.current === null;
    const isRegionChanged =
      previousRegionSignature.current !== null &&
      previousRegionSignature.current !== regionSignature;
    const tracksToFetch =
      isInitialFetch || isRegionChanged
        ? tracks
        : tracks.filter((track) => {
            const previousSignature = previousFetchSignatures.current[track.id];
            const currentSignature = currentFetchSignatures[track.id];
            return previousSignature === undefined || previousSignature !== currentSignature;
          });

    if (tracksToFetch.length === 0) {
      previousRegionSignature.current = regionSignature;
      previousFetchSignatures.current = currentFetchSignatures;
      if (isInitialFetch || isRegionChanged) onSettledRef.current?.();
      return;
    }

    const fetchIds = new Set(tracksToFetch.map((track) => track.id));
    setFetchingTrackIds(fetchIds);

    Promise.all(
      tracksToFetch.map(async (track) => {
        const result = await fetchTrackData({ registry, track, region });
        return [track.id, result] as const;
      }),
    ).then((results) => {
      if (!active) return;
      const latestData = pruneData(useDataStore.getState().data, currentTrackIds);
      const nextData: Record<string, DataResult> = { ...latestData };
      for (const [trackId, result] of results) {
        nextData[trackId] = result;
      }
      previousRegionSignature.current = regionSignature;
      previousFetchSignatures.current = currentFetchSignatures;
      setData(nextData);
      setFetchingTrackIds(new Set());
      onSettledRef.current?.();
    });

    return () => {
      active = false;
    };
  }, [region, regionSignature, registry, setData, tracks, useDataStore]);

  const dataStates = useMemo(
    () => createDataStates(tracks, completedData, fetchingTrackIds),
    [completedData, fetchingTrackIds, tracks],
  );

  return {
    dataStates,
    isFetching: fetchingTrackIds.size > 0,
  };
}

function createRegionSignature(region: BrowserRegion) {
  return `${region.chromosome}:${region.start}-${region.end}`;
}

function createTrackFetchSignatures(registry: ModuleRegistry, tracks: TrackConfigBase[]) {
  const signatures: Record<string, string> = {};
  for (const track of tracks) {
    try {
      signatures[track.id] = createFetchSignature(registry.get(track.type), track);
    } catch {
      signatures[track.id] = "{}";
    }
  }
  return signatures;
}

function pruneData(data: Record<string, DataResult>, trackIds: Set<string>) {
  const nextData: Record<string, DataResult> = {};
  for (const trackId of trackIds) {
    const result = data[trackId];
    if (result) nextData[trackId] = result;
  }
  return nextData;
}

function createDataStates(
  tracks: TrackConfigBase[],
  data: Record<string, DataResult>,
  fetchingTrackIds: Set<string>,
) {
  const states: Record<string, DataState> = {};
  for (const track of tracks) {
    const result = data[track.id];
    if (fetchingTrackIds.has(track.id)) {
      states[track.id] = result?.status === "success" ? result : { status: "loading" };
    } else {
      states[track.id] = result ?? { status: "loading" };
    }
  }
  return states;
}
