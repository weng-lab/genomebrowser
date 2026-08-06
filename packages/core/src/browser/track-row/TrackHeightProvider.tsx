import { useMemo, type ReactNode } from "react";
import { useTrackStore } from "../state/browserContextState";
import { TrackHeightContext, type TrackHeightContextValue } from "./trackHeightContext";

export function TrackHeightProvider({ children }: { children: ReactNode }) {
  const getTrack = useTrackStore((state) => state.getTrack);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const value = useMemo<TrackHeightContextValue>(
    () => ({
      getTrackHeight: (trackId: string) => getTrack(trackId)?.base.height,
      updateHeight: (trackId: string, height: number) => updateTrack(trackId, { base: { height } }),
    }),
    [getTrack, updateTrack],
  );

  return <TrackHeightContext.Provider value={value}>{children}</TrackHeightContext.Provider>;
}
