import type { ReactNode } from "react";
import { TrackSelectContext } from "./trackSelectContext";
import type { TrackSelectState } from "./useTrackSelectState";

export function TrackSelectProvider({
  value,
  children,
}: {
  value: TrackSelectState;
  children: ReactNode;
}) {
  return <TrackSelectContext value={value}>{children}</TrackSelectContext>;
}
