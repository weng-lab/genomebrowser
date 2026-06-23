import { createContext, useMemo, type ReactNode } from "react";
import type { TrackConfigBase, TrackSettingsUpdate } from "../../modules/types";
import { useTrackStore } from "../state/BrowserContext";

export type TrackHeightContextValue = {
  getTrackHeight: (trackId: string) => number | undefined;
  updateTrack: <Config extends TrackConfigBase>(
    trackId: string,
    partial: TrackSettingsUpdate<Config>,
  ) => void;
};

export const TrackHeightContext = createContext<TrackHeightContextValue | null>(null);

export function TrackHeightProvider({ children }: { children: ReactNode }) {
  const getTrack = useTrackStore((state) => state.getTrack);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const value = useMemo<TrackHeightContextValue>(
    () => ({
      getTrackHeight: (trackId: string) => getTrack(trackId)?.height,
      updateTrack,
    }),
    [getTrack, updateTrack],
  );

  return <TrackHeightContext.Provider value={value}>{children}</TrackHeightContext.Provider>;
}
