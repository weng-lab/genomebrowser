import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { createFetchSignature } from "../../modules/fetchOnChange";
import type { ModuleRegistry } from "../../modules/registry";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import type { TrackStoreInstance } from "../state/trackStore";
import { getTrackDataState } from "./dataStore";
import { fetchTrackData } from "./fetchTrackData";
import type { DataResult, DataState, DataStoreInstance } from "./types";

export function useTrackData({
  useDataStore,
  useTrackStore,
  region,
  onSettled,
}: {
  useDataStore: DataStoreInstance;
  useTrackStore: TrackStoreInstance;
  region: GenomicRegion;
  onSettled?: () => void;
}) {
  const trackDataKey = useTrackStore((state) => createTrackDataKey(state.registry, state.tracks));
  const trackSnapshot = useMemo(
    () => createTrackSnapshot(useTrackStore, trackDataKey),
    [trackDataKey, useTrackStore],
  );
  const { registry, tracks } = trackSnapshot;
  const completedData = useDataStore((state) => state.data);
  const fetchingTrackIds = useDataStore((state) => state.fetchingTrackIds);
  const setData = useDataStore((state) => state.setData);
  const setFetchingTrackIds = useDataStore((state) => state.setFetchingTrackIds);
  const previousRegionKey = useRef<string | null>(null);
  const previousFetchKeys = useRef<Record<string, string>>({});
  const onSettledEvent = useEffectEvent(() => onSettled?.());
  const fetchRegion = useMemo<GenomicRegion>(
    () => ({ chromosome: region.chromosome, end: region.end, start: region.start }),
    [region.chromosome, region.end, region.start],
  );
  const regionKey = createRegionKey(fetchRegion);

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
      onSettledEvent();
      return;
    }

    Promise.all(
      tracksToFetch.map(async (track) => {
        const result = await fetchTrackData({ registry, track, region: fetchRegion });
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
  }, [fetchRegion, regionKey, registry, setData, setFetchingTrackIds, tracks, useDataStore]);

  const dataStates = useMemo(
    () => createDataStates(tracks, completedData, fetchingTrackIds),
    [completedData, fetchingTrackIds, tracks],
  );

  return {
    dataStates,
    isFetching: fetchingTrackIds.size > 0,
  };
}

function createRegionKey(region: GenomicRegion) {
  return `${region.chromosome}:${region.start}-${region.end}`;
}

function createTrackSnapshot(useTrackStore: TrackStoreInstance, key: string) {
  const { registry, tracks } = useTrackStore.getState();
  return { key, registry, tracks };
}

function createTrackDataKey(registry: ModuleRegistry, tracks: AnyTrackInstance[]) {
  const entries = tracks.map((track) => ({
    id: track.base.id,
    fetch: createTrackFetchKey(registry, track),
  }));
  entries.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return JSON.stringify(entries);
}

function createTrackFetchKeys(registry: ModuleRegistry, tracks: AnyTrackInstance[]) {
  const keys: Record<string, string> = {};
  for (const track of tracks) {
    keys[track.base.id] = createTrackFetchKey(registry, track);
  }
  return keys;
}

function createTrackFetchKey(registry: ModuleRegistry, track: AnyTrackInstance) {
  return JSON.stringify({
    type: track.type,
    signature: createFetchSignature(registry.get(track.type), track),
  });
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
  fetchingTrackIds: ReadonlySet<string>,
) {
  const states: Record<string, DataState> = {};
  for (const track of tracks) {
    const trackId = track.base.id;
    const result = data[trackId];
    states[trackId] = getTrackDataState(result, fetchingTrackIds.has(trackId));
  }
  return states;
}
