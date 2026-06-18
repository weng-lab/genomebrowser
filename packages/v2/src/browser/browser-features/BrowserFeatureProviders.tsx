import type { ReactNode } from "react";
import { BrowserSvgProvider } from "../browser-svg/BrowserSvgProvider";
import { TooltipProvider } from "../tooltip/TooltipProvider";
import type { TrackConfigBase, TrackSettingsUpdate } from "../../modules/types";
import { TrackHeightProvider } from "../track-height/TrackHeightProvider";

export function BrowserFeatureProviders({
  children,
  getTrackHeight,
  isPanning,
  svg,
  updateTrack,
}: {
  children: ReactNode;
  svg: SVGSVGElement | null;
  isPanning: boolean;
  getTrackHeight: (trackId: string) => number | undefined;
  updateTrack: <Config extends TrackConfigBase>(
    trackId: string,
    partial: TrackSettingsUpdate<Config>,
  ) => void;
}) {
  return (
    <BrowserSvgProvider svg={svg}>
      <TrackHeightProvider getTrackHeight={getTrackHeight} updateTrack={updateTrack}>
        <TooltipProvider disabled={isPanning}>{children}</TooltipProvider>
      </TrackHeightProvider>
    </BrowserSvgProvider>
  );
}
