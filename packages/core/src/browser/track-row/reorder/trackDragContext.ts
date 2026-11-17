import { createContext, use } from "react";
import type { PointerEvent } from "react";
import type { TrackMoveSource } from "../../state/trackPlacement";

export type StartTrackDrag = (source: TrackMoveSource, event: PointerEvent<SVGElement>) => void;

export const TrackDragContext = createContext<StartTrackDrag | null>(null);

export function useTrackDrag() {
  const start = use(TrackDragContext);
  if (!start) throw new Error("Track dragging requires the hosting browser's drag provider.");
  return start;
}
