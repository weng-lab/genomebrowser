import type { AssemblyDefinition } from "../../genome/assembly";
import type { GenomicRegion } from "../../genome/region";
import { createFetchSignature } from "../../modules/fetchOnChange";
import type { ModuleRegistry } from "../../modules/registry";
import type { AnyTrackInstance, TrackFetch } from "../../modules/types";
import type { BrowserStoreInstance } from "../state/browserStore";
import type { TrackStoreInstance } from "../state/trackStore";
import { getRenderWindow } from "../viewport/renderWindow";
import { createTrackResourceStore, type TrackResourceStoreInstance } from "./trackResourceStore";

/** How far beyond the visible region each request loads, as a multiple of the visible span. */
export const PAN_OVERSCAN_MULTIPLIER = 3;
const WIDTH_DEBOUNCE_MS = 200;

type TrackResultBase = {
  /** The genomic region the data covers. */
  region: GenomicRegion;
  /** Debounced track width when the request started. */
  trackWidth: number;
  /** Visible span (`end - start`) when the request started. */
  visibleSpan: number;
  assemblyKey: string;
  fetchKey: string;
  demandKey: string;
};

export type TrackResult =
  | (TrackResultBase & { status: "ready"; data: unknown })
  | (TrackResultBase & { status: "error"; error: string });

/** What a track row shows: its last result when it still fits the view, otherwise loading. */
export type TrackDataState = { status: "loading" } | TrackResult;

type PendingRequest = { fetchKey: string; demandKey: string; controller: AbortController };

type TrackEntry = { current?: TrackResult; pending?: PendingRequest };

type Demand = {
  assembly: AssemblyDefinition;
  assemblyKey: string;
  view: GenomicRegion;
  region: GenomicRegion;
  width: number;
  trackWidth: number;
  key: string;
};

export type TrackDataController = {
  /** Mirrors the measured track width. Changes are debounced before they refetch. */
  setTrackWidth(width: number): void;
  subscribe(listener: () => void): () => void;
  /** Stable until that track's displayed state changes. */
  getTrack(trackId: string): TrackDataState;
  /** Starts following the stores and fetching. Returns a function that stops and releases everything. */
  connect(): () => void;
};

const loadingState: TrackDataState = { status: "loading" };

/**
 * Owns track data for one mounted browser. Each track fetches on its own and
 * shows its result as soon as it arrives. The controller reads the region,
 * assembly and tracks straight from the stores, so a committed region starts
 * its requests and sets the browser store's `isLoading` in the same update.
 */
export function createTrackDataController({
  browserStore,
  trackStore,
  trackWidth: initialTrackWidth,
  widthDebounceMs = WIDTH_DEBOUNCE_MS,
  resourceStore = createTrackResourceStore(),
}: {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  trackWidth: number;
  widthDebounceMs?: number;
  resourceStore?: TrackResourceStoreInstance;
}): TrackDataController {
  const entries = new Map<string, TrackEntry>();
  const states = new Map<string, TrackDataState>();
  const fetchKeys = new WeakMap<AnyTrackInstance, string>();
  const assemblyKeys = new WeakMap<AssemblyDefinition, string>();
  const listeners = new Set<() => void>();
  let connected = false;
  let trackWidth = initialTrackWidth;
  let debouncedTrackWidth = initialTrackWidth;
  let widthTimer: ReturnType<typeof setTimeout> | undefined;
  let retainedTracks: AnyTrackInstance[] | undefined;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const fetchKeyFor = (registry: ModuleRegistry, track: AnyTrackInstance) => {
    let key = fetchKeys.get(track);
    if (key === undefined) {
      key = createTrackFetchKey(registry, track);
      fetchKeys.set(track, key);
    }
    return key;
  };

  const assemblyKeyFor = (assembly: AssemblyDefinition) => {
    let key = assemblyKeys.get(assembly);
    if (key === undefined) {
      key = JSON.stringify(assembly);
      assemblyKeys.set(assembly, key);
    }
    return key;
  };

  const getDemand = (): Demand => {
    const { region: view, assembly } = browserStore.getState();
    const target = getRenderWindow(view, assembly, debouncedTrackWidth, PAN_OVERSCAN_MULTIPLIER);
    const region = target?.targetRenderRegion ?? view;
    const width = target?.renderWidth ?? Math.max(0, debouncedTrackWidth);
    const assemblyKey = assemblyKeyFor(assembly);
    return {
      assembly,
      assemblyKey,
      view,
      region,
      width,
      trackWidth: debouncedTrackWidth,
      key: JSON.stringify({ assembly: assemblyKey, region, width }),
    };
  };

  const displayState = (entry: TrackEntry | undefined, fetchKey: string, demand: Demand) => {
    const current = entry?.current;
    const view = demand.view;
    // Retain data for panning, but never magnify an old window across a zoom.
    return current &&
      current.fetchKey === fetchKey &&
      current.assemblyKey === demand.assemblyKey &&
      current.region.chromosome === view.chromosome &&
      current.visibleSpan === view.end - view.start
      ? current
      : loadingState;
  };

  const startFetch = (
    registry: ModuleRegistry,
    track: AnyTrackInstance,
    fetchKey: string,
    demand: Demand,
  ) => {
    const trackId = track.base.id;
    const entry = entries.get(trackId) ?? {};
    entry.pending?.controller.abort();
    const request: PendingRequest = {
      fetchKey,
      demandKey: demand.key,
      controller: new AbortController(),
    };
    entries.set(trackId, { current: entry.current, pending: request });
    const base = {
      region: demand.region,
      trackWidth: demand.trackWidth,
      visibleSpan: demand.view.end - demand.view.start,
      assemblyKey: demand.assemblyKey,
      fetchKey,
      demandKey: demand.key,
    };

    const run = async (): Promise<TrackResult> => {
      try {
        const fetchTrack = registry.get(track.type).fetch as TrackFetch<unknown, unknown>;
        const data = await fetchTrack({
          track: {
            base: { id: trackId, display: track.base.display },
            type: track.type,
            config: track.config,
          },
          demand: {
            assembly: demand.assembly,
            region: demand.region,
            visibleRegion: demand.view,
            width: demand.width,
          },
          resources: resourceStore.resourcesFor({ type: track.type, id: trackId }),
          signal: request.controller.signal,
        });
        return { ...base, status: "ready", data };
      } catch (error) {
        return {
          ...base,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    };

    void run().then((result) => {
      // A newer request, a removed track, or a disconnect replaced this one.
      if (!connected || entries.get(trackId)?.pending !== request) return;
      entries.set(trackId, { current: result });
      update();
    });
  };

  /** Brings every track in line with the stores and notifies if anything visible changed. */
  const update = () => {
    if (!connected) return;
    const { tracks, registry } = trackStore.getState();
    const demand = getDemand();
    const chromosomeLength = demand.assembly.chromosomes[demand.view.chromosome] ?? 0;

    if (tracks !== retainedTracks) {
      retainedTracks = tracks;
      const trackIds = new Set(tracks.map((track) => track.base.id));
      for (const [trackId, entry] of entries) {
        if (trackIds.has(trackId)) continue;
        entry.pending?.controller.abort();
        entries.delete(trackId);
      }
      // Removing a track releases its stored fetcher resources.
      resourceStore.retain(tracks.map((track) => ({ type: track.type, id: track.base.id })));
    }

    for (const track of tracks) {
      const trackId = track.base.id;
      const fetchKey = fetchKeyFor(registry, track);
      const entry = entries.get(trackId);
      const current = entry?.current;
      const pending = entry?.pending;
      const isCurrentRequest = (result: { fetchKey: string; demandKey: string } | undefined) =>
        result?.fetchKey === fetchKey && result.demandKey === demand.key;
      if (isCurrentRequest(pending)) continue;
      if (
        current &&
        (isCurrentRequest(current) || coversView(current, fetchKey, demand, chromosomeLength))
      ) {
        if (pending) {
          pending.controller.abort();
          entries.set(trackId, { current });
        }
        continue;
      }
      startFetch(registry, track, fetchKey, demand);
    }

    setIsLoading([...entries.values()].some((entry) => entry.pending));
    let changed = false;
    for (const trackId of states.keys()) {
      if (entries.has(trackId)) continue;
      states.delete(trackId);
      changed = true;
    }
    for (const track of tracks) {
      const trackId = track.base.id;
      const next = displayState(entries.get(trackId), fetchKeyFor(registry, track), demand);
      if (states.get(trackId) === next) continue;
      states.set(trackId, next);
      changed = true;
    }
    if (changed) notify();
  };

  const setIsLoading = (isLoading: boolean) => {
    if (browserStore.getState().isLoading !== isLoading) browserStore.setState({ isLoading });
  };

  /** A pending width change joins the next region, assembly, or track change instead of refetching twice. */
  const flushWidth = () => {
    if (widthTimer === undefined) return;
    clearTimeout(widthTimer);
    widthTimer = undefined;
    debouncedTrackWidth = trackWidth;
  };

  return {
    setTrackWidth(width) {
      if (width === trackWidth) return;
      trackWidth = width;
      clearTimeout(widthTimer);
      widthTimer = undefined;
      if (widthDebounceMs <= 0) {
        debouncedTrackWidth = width;
        update();
        return;
      }
      widthTimer = setTimeout(() => {
        widthTimer = undefined;
        debouncedTrackWidth = trackWidth;
        update();
      }, widthDebounceMs);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getTrack: (trackId) => states.get(trackId) ?? loadingState,
    connect() {
      connected = true;
      const unsubscribeBrowser = browserStore.subscribe((state, previous) => {
        if (state.region === previous.region && state.assembly === previous.assembly) return;
        flushWidth();
        update();
      });
      const unsubscribeTracks = trackStore.subscribe((state, previous) => {
        if (state.tracks === previous.tracks && state.registry === previous.registry) return;
        flushWidth();
        update();
      });
      update();

      return () => {
        connected = false;
        unsubscribeBrowser();
        unsubscribeTracks();
        clearTimeout(widthTimer);
        widthTimer = undefined;
        debouncedTrackWidth = trackWidth;
        for (const entry of entries.values()) entry.pending?.controller.abort();
        entries.clear();
        states.clear();
        retainedTracks = undefined;
        setIsLoading(false);
        resourceStore.clear();
      };
    },
  };
}

/**
 * Whether a finished result still serves the current demand without a new
 * request: same fetch inputs, assembly and zoom, and at least half a visible span of
 * data left beyond each edge of the view, or data reaching the chromosome end
 * on that side.
 */
function coversView(
  current: TrackResult,
  fetchKey: string,
  demand: Demand,
  chromosomeLength: number,
) {
  const { view } = demand;
  const span = view.end - view.start;
  if (
    current.status !== "ready" ||
    current.fetchKey !== fetchKey ||
    current.assemblyKey !== demand.assemblyKey ||
    current.region.chromosome !== view.chromosome ||
    current.visibleSpan !== span ||
    current.trackWidth !== demand.trackWidth
  ) {
    return false;
  }
  const margin = span / 2;
  const leftCovered = current.region.start <= 0 || current.region.start <= view.start - margin;
  const rightCovered =
    current.region.end >= chromosomeLength || current.region.end >= view.end + margin;
  return leftCovered && rightCovered;
}

export function createTrackFetchKey(registry: ModuleRegistry, track: AnyTrackInstance) {
  return JSON.stringify({
    type: track.type,
    display: track.base.display,
    signature: createFetchSignature(registry.get(track.type), track),
  });
}
