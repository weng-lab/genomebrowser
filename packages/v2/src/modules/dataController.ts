import { useEffect, useMemo, useReducer } from "react";
import type { BrowserRegion } from "../utils/region";
import type { TrackConfigBase, TrackDataState } from "./types";
import type { createModuleRegistry } from "./registry";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function useTrackData(tracks: TrackConfigBase[], region: BrowserRegion, width: number, registry: ModuleRegistry) {
  const [states, dispatch] = useReducer(dataStateReducer, {});
  const signature = useMemo(() => JSON.stringify({ region, tracks, width }), [region, tracks, width]);

  useEffect(() => {
    const controllers = new Map<string, AbortController>();
    let active = true;
    const currentIds = new Set(tracks.map((track) => track.id));

    dispatch({ type: "sync", ids: currentIds });

    for (const track of tracks) {
      const controller = new AbortController();
      controllers.set(track.id, controller);

      dispatch({ type: "loading", id: track.id });

      Promise.resolve()
        .then(() => {
          const module = registry.get(track.type);
          return module.fetch({ track: module.validate(track), region, width, signal: controller.signal });
        })
        .then((data) => {
          if (!active || controller.signal.aborted) return;
          dispatch({ type: "success", id: track.id, data });
        })
        .catch((error: unknown) => {
          if (!active || controller.signal.aborted) return;
          dispatch({ type: "error", id: track.id, error: error instanceof Error ? error.message : "Unknown error" });
        });
    }

    return () => {
      active = false;
      for (const controller of controllers.values()) {
        controller.abort();
      }
    };
  }, [signature, registry, region, tracks, width]);

  return states;
}

type DataStateAction =
  | { type: "sync"; ids: Set<string> }
  | { type: "loading"; id: string }
  | { type: "success"; id: string; data: unknown }
  | { type: "error"; id: string; error: string };

function dataStateReducer(state: Record<string, TrackDataState>, action: DataStateAction): Record<string, TrackDataState> {
  switch (action.type) {
    case "sync": {
      const next: Record<string, TrackDataState> = {};
      for (const id of action.ids) {
        next[id] = state[id]?.status === "success" ? state[id] : { status: "loading" };
      }
      return next;
    }
    case "loading":
      return { ...state, [action.id]: { status: "loading" } };
    case "success":
      return { ...state, [action.id]: { status: "success", data: action.data } };
    case "error":
      return { ...state, [action.id]: { status: "error", error: action.error } };
  }
}
