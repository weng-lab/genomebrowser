import { createContext, useMemo, type ReactNode } from "react";
import type { TrackMutationResult } from "../../modules/types";
import { useTrackStore } from "../state/BrowserContext";

export type TrackHeightContextValue = {
  getTrackHeight: (trackId: string) => number | undefined;
  updateHeight: (trackId: string, height: number) => TrackMutationResult;
};

export const TrackHeightContext = createContext<TrackHeightContextValue | null>(null);

export function TrackHeightProvider({ children }: { children: ReactNode }) {
  const getTrack = useTrackStore((state) => state.getTrack);
  const updateBase = useTrackStore((state) => state.updateBase);
  const value = useMemo<TrackHeightContextValue>(
    () => ({
      getTrackHeight: (trackId: string) => getTrack(trackId)?.base.height,
      updateHeight: (trackId: string, height: number) => updateBase(trackId, { height }),
    }),
    [getTrack, updateBase],
  );

  return <TrackHeightContext.Provider value={value}>{children}</TrackHeightContext.Provider>;
}
