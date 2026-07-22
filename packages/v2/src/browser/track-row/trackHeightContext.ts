import { createContext } from "react";
import type { TrackMutationResult } from "../../modules/types";

export type TrackHeightContextValue = {
  getTrackHeight: (trackId: string) => number | undefined;
  updateHeight: (trackId: string, height: number) => TrackMutationResult;
};

export const TrackHeightContext = createContext<TrackHeightContextValue | null>(null);
