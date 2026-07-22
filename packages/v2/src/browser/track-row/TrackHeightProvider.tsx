import { useMemo, type ReactNode } from "react";
import { useTrackStore } from "../state/browserContextState";
import { TrackHeightContext, type TrackHeightContextValue } from "./trackHeightContext";

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
