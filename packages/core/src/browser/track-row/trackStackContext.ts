import { createContext, use } from "react";
import type { TrackDataController } from "../data/trackDataController";
import type { RegisterContentGroup } from "../viewport/useContentTransform";
import type { PanDragHandlers } from "../viewport/usePanDrag";

/**
 * What every track in the stack shares: the browser's frame geometry, its pan
 * wiring, and its data controller. Changes only with the geometry, which every
 * track redraws for anyway; the visible region stays a prop so this value does
 * not change on every pan.
 */
export type TrackStackContextValue = {
  dataController: TrackDataController;
  marginWidth: number;
  trackWidth: number;
  titleSize: number;
  registerContentGroup: RegisterContentGroup;
  panDrag: PanDragHandlers;
};

export const TrackStackContext = createContext<TrackStackContextValue | null>(null);

export function useTrackStack() {
  const context = use(TrackStackContext);
  if (!context) throw new Error("useTrackStack must be used within a TrackStack");
  return context;
}
