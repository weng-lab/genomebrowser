import { use } from "react";
import { TrackHeightContext } from "./TrackHeightProvider";

export function useTrackHeightController() {
  const controller = use(TrackHeightContext);
  if (!controller) throw new Error("useAutoTrackHeight must be used within a GenomeBrowser");
  return controller;
}
