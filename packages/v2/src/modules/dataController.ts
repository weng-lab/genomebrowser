import { useEffect, useMemo, useReducer } from "react";
import type { BrowserRegion } from "../utils/region";
import type { TrackConfigBase, TrackDataState } from "./types";
import type { createModuleRegistry } from "./registry";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;
type TrackDataOptions = {
  keepPreviousSuccess?: boolean;
  onSettled?: (signature: string) => void;
};

export function useTrackData(
  tracks: TrackConfigBase[],
  region: BrowserRegion,
  width: number,
  registry: ModuleRegistry,
  options: TrackDataOptions = {},
) {
  const [states, dispatch] = useReducer(dataStateReducer, {});
  const trackIdsSignature = useMemo(() => createTrackIdsSignature(tracks), [tracks]);
  const signature = useMemo(
    () => JSON.stringify({ region, trackIds: trackIdsSignature, width }),
    [region, trackIdsSignature, width],
  );
  const { keepPreviousSuccess = false, onSettled } = options;

  useEffect(() => {
    let active = true;
    const currentIds = new Set(tracks.map((track) => track.id));
    dispatch({ type: "sync", ids: currentIds, keepPreviousSuccess });

    Promise.all(
      tracks.map((track) =>
        Promise.resolve()
          .then(() => {
            const module = registry.get(track.type);
            return module.fetch({ track: module.validate(track), region, width });
          })
          .then((data): TrackFetchResult => ({ id: track.id, state: { status: "success", data } }))
          .catch(
            (error: unknown): TrackFetchResult => ({
              id: track.id,
              state: {
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            }),
          ),
      ),
    ).then((results) => {
      if (!active) return;
      dispatch({ type: "settled", results });
      onSettled?.(signature);
    });

    return () => {
      active = false;
    };
  }, [keepPreviousSuccess, onSettled, registry, region, signature, trackIdsSignature, width]);

  return states;
}

export function createTrackIdsSignature(tracks: TrackConfigBase[]) {
  return JSON.stringify(tracks.map((track) => track.id).sort());
}

type TrackFetchResult = { id: string; state: TrackDataState };

type DataStateAction =
  | { type: "sync"; ids: Set<string>; keepPreviousSuccess: boolean }
  | { type: "settled"; results: TrackFetchResult[] };

function dataStateReducer(
  state: Record<string, TrackDataState>,
  action: DataStateAction,
): Record<string, TrackDataState> {
  switch (action.type) {
    case "sync": {
      const next: Record<string, TrackDataState> = {};
      for (const id of action.ids) {
        next[id] =
          action.keepPreviousSuccess && state[id]?.status === "success"
            ? state[id]
            : { status: "loading" };
      }
      return next;
    }
    case "settled": {
      const next = { ...state };
      for (const result of action.results) {
        next[result.id] = result.state;
      }
      return next;
    }
  }
}
