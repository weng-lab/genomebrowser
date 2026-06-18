import { createContext, useMemo, type ReactNode } from "react";
import type { TrackConfigBase, TrackSettingsUpdate } from "../../modules/types";

export type TrackHeightContextValue = {
  getTrackHeight: (trackId: string) => number | undefined;
  updateTrack: <Config extends TrackConfigBase>(
    trackId: string,
    partial: TrackSettingsUpdate<Config>,
  ) => void;
};

export const TrackHeightContext = createContext<TrackHeightContextValue | null>(null);

export function TrackHeightProvider({
  children,
  getTrackHeight,
  updateTrack,
}: TrackHeightContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ getTrackHeight, updateTrack }), [getTrackHeight, updateTrack]);

  return <TrackHeightContext.Provider value={value}>{children}</TrackHeightContext.Provider>;
}
