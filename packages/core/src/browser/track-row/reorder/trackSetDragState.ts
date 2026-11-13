import { createContext, useCallback, useContext, type RefObject, type PointerEvent } from "react";
import type { TrackMoveSource } from "../../state/trackPlacement";

export type TrackSetDragHandle = (source: TrackMoveSource, event: PointerEvent<SVGElement>) => void;
/** The controller exposes an event-time entry point without rerendering its callers. */
export const TrackSetDragContext = createContext<RefObject<TrackSetDragHandle | null> | null>(null);
export function useTrackSetDrag() {
  const handle = useContext(TrackSetDragContext);
  if (!handle) throw new Error("Track dragging requires the owning browser's drag context.");
  return useCallback<TrackSetDragHandle>(
    (source, event) => handle.current?.(source, event),
    [handle],
  );
}
