import { createContext, use, type ReactNode } from "react";
import type { TrackSelectState } from "./useTrackSelectState";

const TrackSelectContext = createContext<TrackSelectState | undefined>(undefined);

export function TrackSelectProvider({
  value,
  children,
}: {
  value: TrackSelectState;
  children: ReactNode;
}) {
  return <TrackSelectContext value={value}>{children}</TrackSelectContext>;
}

export function useTrackSelect() {
  const trackSelect = use(TrackSelectContext);
  if (!trackSelect) {
    throw new Error("TrackSelect components must be rendered inside TrackSelectProvider");
  }
  return trackSelect;
}
