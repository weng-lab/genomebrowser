import type { ReactNode } from "react";
import { BrowserSvgProvider } from "../browser-svg/BrowserSvgProvider";
import { TooltipProvider } from "../tooltip/TooltipProvider";
import { TrackHeightProvider } from "../track-height/TrackHeightProvider";
import { useRegistry } from "../registry/useRegistry";

export function BrowserFeatureProviders({
  children,
  isPanning,
  svg,
}: {
  children: ReactNode;
  svg: SVGSVGElement | null;
  isPanning: boolean;
}) {
  const registry = useRegistry();
  return (
    <BrowserSvgProvider svg={svg}>
      <TrackHeightProvider>
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
