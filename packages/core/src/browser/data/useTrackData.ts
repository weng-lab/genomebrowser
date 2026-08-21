import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { AssemblyDefinition } from "../../genome/assembly";
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
  assembly,
  region,
  width,
  onSettled,
}: {
  useDataStore: DataStoreInstance;
  useTrackStore: TrackStoreInstance;
  assembly: AssemblyDefinition;
  region: GenomicRegion;
  width: number;
  onSettled?: () => void;
}) {
  useTrackStore((state) => createTrackDataKey(state.registry, state.tracks));
  const { registry, tracks } = useTrackStore.getState();
  const currentFetchKeys = useMemo(
    () => createTrackFetchKeys(registry, tracks),
    [registry, tracks],
  );
  const completedData = useDataStore((state) => state.data);
  const fetchingTrackIds = useDataStore((state) => state.fetchingTrackIds);
  const setData = useDataStore((state) => state.setData);
  const setFetchingTrackIds = useDataStore((state) => state.setFetchingTrackIds);
  const previousDemand = useRef<FetchDemandIdentity | null>(null);
  const previousFetchKeys = useRef<Record<string, string>>({});
  const onSettledEvent = useEffectEvent(() => onSettled?.());
  const fetchRegion = useMemo<GenomicRegion>(
    () => ({ chromosome: region.chromosome, end: region.end, start: region.start }),
    [region.chromosome, region.end, region.start],
  );
  const demandIdentity = useMemo(
    () => createDemandIdentity(assembly, fetchRegion, width),
    [assembly, fetchRegion, width],
  );
  const incompatibleTrackIds = getIncompatibleTrackIds(
    tracks,
    previousDemand.current,
    demandIdentity,
    previousFetchKeys.current,
    currentFetchKeys,
  );

  useEffect(() => {
    let active = true;
    const currentTrackIds = new Set(tracks.map((track) => track.base.id));
    const currentData = useDataStore.getState().data;
    const prunedData = pruneData(currentData, currentTrackIds);
    const removedTracks = Object.keys(currentData).length !== Object.keys(prunedData).length;
    const previousDemandIdentity = previousDemand.current;
    const isInitialFetch = previousDemandIdentity === null;
    const isDemandChanged =
      previousDemandIdentity !== null && previousDemandIdentity.key !== demandIdentity.key;
    const tracksToFetch =
      isInitialFetch || isDemandChanged
        ? tracks
        : tracks.filter((track) => {
            const previousKey = previousFetchKeys.current[track.base.id];
            const currentKey = currentFetchKeys[track.base.id];
            return (
              previousKey === undefined ||
              previousKey !== currentKey ||
              currentData[track.base.id] === undefined
            );
          });

    const invalidatedTrackIds = getIncompatibleTrackIds(
      tracks,
      previousDemandIdentity,
      demandIdentity,
      previousFetchKeys.current,
      currentFetchKeys,
    );
    const fetchData = removeData(prunedData, invalidatedTrackIds);
    const invalidatedData = Object.keys(fetchData).length !== Object.keys(prunedData).length;

    if (removedTracks || invalidatedData) setData(fetchData);

    const fetchIds = new Set(tracksToFetch.map((track) => track.base.id));
    setFetchingTrackIds(fetchIds);

    if (tracksToFetch.length === 0) {
      previousDemand.current = demandIdentity;
      previousFetchKeys.current = currentFetchKeys;
      onSettledEvent();
      return;
    }

    Promise.all(
      tracksToFetch.map(async (track) => {
        const result = await fetchTrackData({
          registry,
          track,
          assembly,
          region: fetchRegion,
          width,
        });
        return [track.base.id, result] as const;
      }),
    ).then((results) => {
      if (!active) return;
      const latestData = pruneData(useDataStore.getState().data, currentTrackIds);
      const nextData: Record<string, DataResult> = { ...latestData };
      for (const [trackId, result] of results) {
        nextData[trackId] = result;
      }
      previousDemand.current = demandIdentity;
      previousFetchKeys.current = currentFetchKeys;
      setData(nextData);
      setFetchingTrackIds(new Set());
      onSettledEvent();
    });

    return () => {
      active = false;
    };
  }, [
    assembly,
    currentFetchKeys,
    demandIdentity,
    fetchRegion,
    registry,
    setData,
    setFetchingTrackIds,
    tracks,
    useDataStore,
    width,
  ]);

  const dataStates = createDataStates(
    tracks,
    completedData,
    fetchingTrackIds,
    incompatibleTrackIds,
  );

  return {
    dataStates,
    isFetching: fetchingTrackIds.size > 0,
  };
}

type FetchDemandIdentity = {
  key: string;
  assembly: string;
  width: number;
};

function createDemandIdentity(
  assembly: AssemblyDefinition,
  region: GenomicRegion,
  width: number,
): FetchDemandIdentity {
  const assemblyKey = JSON.stringify(assembly);
  return {
    key: JSON.stringify({ assembly: assemblyKey, region, width }),
    assembly: assemblyKey,
    width,
  };
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

function getIncompatibleTrackIds(
  tracks: AnyTrackInstance[],
  previousDemand: FetchDemandIdentity | null,
  demand: FetchDemandIdentity,
  previousFetchKeys: Record<string, string>,
  currentFetchKeys: Record<string, string>,
) {
  const trackIds = new Set<string>();
  if (previousDemand === null) return trackIds;
  const isRenderShapeChanged =
    previousDemand.assembly !== demand.assembly || previousDemand.width !== demand.width;
  for (const track of tracks) {
    const trackId = track.base.id;
    const previousKey = previousFetchKeys[trackId];
    const isTrackFetchChanged =
      previousKey !== undefined && previousKey !== currentFetchKeys[trackId];
    if (isRenderShapeChanged || isTrackFetchChanged) trackIds.add(trackId);
  }
  return trackIds;
}

function createTrackFetchKey(registry: ModuleRegistry, track: AnyTrackInstance) {
  return JSON.stringify({
    type: track.type,
    display: track.base.display,
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

function removeData(data: Record<string, DataResult>, trackIds: Set<string>) {
  if (trackIds.size === 0) return data;
  const nextData = { ...data };
  for (const trackId of trackIds) delete nextData[trackId];
  return nextData;
}

function createDataStates(
  tracks: AnyTrackInstance[],
  data: Record<string, DataResult>,
  fetchingTrackIds: ReadonlySet<string>,
  incompatibleTrackIds: ReadonlySet<string>,
) {
  const states: Record<string, DataState> = {};
  for (const track of tracks) {
    const trackId = track.base.id;
    const isIncompatible = incompatibleTrackIds.has(trackId);
    const result = isIncompatible ? undefined : data[trackId];
    states[trackId] = getTrackDataState(result, isIncompatible || fetchingTrackIds.has(trackId));
  }
  return states;
}
