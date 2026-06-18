import { createContext, type ReactNode } from "react";
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
  return (
    <TrackHeightContext.Provider value={{ getTrackHeight, updateTrack }}>
      {children}
    </TrackHeightContext.Provider>
  );
}
