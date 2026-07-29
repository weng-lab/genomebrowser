import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createFetchSignature } from "../../modules/fetchOnChange";
import type { ModuleRegistry } from "../../modules/registry";
import type { AnyTrackInstance } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import { fetchTrackData } from "./fetchTrackData";
import type { DataResult, DataState, DataStoreInstance } from "./types";

export function useTrackData({
  useDataStore,
  registry,
  tracks,
  region,
  onSettled,
}: {
  useDataStore: DataStoreInstance;
  registry: ModuleRegistry;
  tracks: AnyTrackInstance[];
  region: BrowserRegion;
  onSettled?: () => void;
}) {
  const completedData = useDataStore((state) => state.data);
  const setData = useDataStore((state) => state.setData);
  const [fetchingTrackIds, setFetchingTrackIds] = useState<Set<string>>(() => new Set());
  const previousRegionKey = useRef<string | null>(null);
  const previousFetchKeys = useRef<Record<string, string>>({});
  const onSettledEvent = useEffectEvent(() => onSettled?.());
  const regionKey = createRegionKey(region);

  useEffect(() => {
    let active = true;
    const currentTrackIds = new Set(tracks.map((track) => track.base.id));
    const currentFetchKeys = createTrackFetchKeys(registry, tracks);
    const prunedData = pruneData(useDataStore.getState().data, currentTrackIds);
    const removedTracks =
      Object.keys(useDataStore.getState().data).length !== Object.keys(prunedData).length;

    if (removedTracks) setData(prunedData);

    const isInitialFetch = previousRegionKey.current === null;
    const isRegionChanged =
      previousRegionKey.current !== null && previousRegionKey.current !== regionKey;
    const tracksToFetch =
      isInitialFetch || isRegionChanged
        ? tracks
        : tracks.filter((track) => {
            const previousKey = previousFetchKeys.current[track.base.id];
            const currentKey = currentFetchKeys[track.base.id];
            return previousKey === undefined || previousKey !== currentKey;
          });

    const fetchIds = new Set(tracksToFetch.map((track) => track.base.id));
    setFetchingTrackIds(fetchIds);

    if (tracksToFetch.length === 0) {
      previousRegionKey.current = regionKey;
      previousFetchKeys.current = currentFetchKeys;
      if (isInitialFetch || isRegionChanged) onSettledEvent();
      return;
    }

    Promise.all(
      tracksToFetch.map(async (track) => {
        const result = await fetchTrackData({ registry, track, region });
        return [track.base.id, result] as const;
      }),
    ).then((results) => {
      if (!active) return;
      const latestData = pruneData(useDataStore.getState().data, currentTrackIds);
      const nextData: Record<string, DataResult> = { ...latestData };
      for (const [trackId, result] of results) {
        nextData[trackId] = result;
      }
      previousRegionKey.current = regionKey;
      previousFetchKeys.current = currentFetchKeys;
      setData(nextData);
      setFetchingTrackIds(new Set());
      onSettledEvent();
    });

    return () => {
      active = false;
    };
  }, [region, regionKey, registry, setData, tracks, useDataStore]);

  const dataStates = useMemo(
    () => createDataStates(tracks, completedData, fetchingTrackIds),
    [completedData, fetchingTrackIds, tracks],
  );

  return {
    dataStates,
    isFetching: fetchingTrackIds.size > 0,
  };
}

function createRegionKey(region: BrowserRegion) {
  return `${region.chromosome}:${region.start}-${region.end}`;
}

function createTrackFetchKeys(registry: ModuleRegistry, tracks: AnyTrackInstance[]) {
  const keys: Record<string, string> = {};
  for (const track of tracks) {
    try {
      keys[track.base.id] = createFetchSignature(registry.get(track.type), track);
    } catch {
      keys[track.base.id] = "{}";
    }
  }
  return keys;
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
  tracks: AnyTrackInstance[],
  data: Record<string, DataResult>,
  fetchingTrackIds: Set<string>,
) {
  const states: Record<string, DataState> = {};
  for (const track of tracks) {
    const trackId = track.base.id;
    const result = data[trackId];
    if (fetchingTrackIds.has(trackId)) {
      states[trackId] = result?.status === "success" ? result : { status: "loading" };
    } else {
      states[trackId] = result ?? { status: "loading" };
    }
  }
  return states;
}
