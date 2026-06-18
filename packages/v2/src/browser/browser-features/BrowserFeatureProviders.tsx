import type { ReactNode } from "react";
import { BrowserSvgProvider } from "../browser-svg/BrowserSvgProvider";
import { TooltipProvider } from "../tooltip/TooltipProvider";
import type { createModuleRegistry } from "../../modules/registry";
import type { TrackConfigBase, TrackSettingsUpdate } from "../../modules/types";
import { TrackHeightProvider } from "../track-height/TrackHeightProvider";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function BrowserFeatureProviders({
  children,
  getTrackHeight,
  isPanning,
  registry,
  svg,
  updateTrack,
}: {
  children: ReactNode;
  registry: ModuleRegistry;
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
        <TooltipProvider
          disabled={isPanning}
          getTooltipComponent={(type) => registry.get(type).tooltipComponent}
        >
          {children}
        </TooltipProvider>
      </TrackHeightProvider>
    </BrowserSvgProvider>
  );
}
