import { createContext, use } from "react";
import type { TrackSelectState } from "./useTrackSelectState";

export const TrackSelectContext = createContext<TrackSelectState | undefined>(undefined);

export function useTrackSelect() {
  const trackSelect = use(TrackSelectContext);
  if (!trackSelect) {
    throw new Error("TrackSelect components must be rendered inside TrackSelectProvider");
  }
  return trackSelect;
}
