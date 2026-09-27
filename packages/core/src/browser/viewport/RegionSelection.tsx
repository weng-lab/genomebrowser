import type { ReactNode } from "react";
import type { GenomicRegion } from "../../genome/region";
import { useGenomeBrowser, useIsInteractionBlocked } from "../state/browserContextState";
import { SelectRegion } from "./SelectRegion";

/** Connects the selection gesture to this browser's mode and highlight state. */
export function RegionSelection({
  svg,
  marginWidth,
  trackWidth,
  totalHeight,
  region,
  children,
}: {
  svg: SVGSVGElement | null;
  marginWidth: number;
  trackWidth: number;
  totalHeight: number;
  region: GenomicRegion;
  children: ReactNode;
}) {
  const isInteractionBlocked = useIsInteractionBlocked();
  const { useBrowserStore } = useGenomeBrowser();
  const setRegion = useBrowserStore((state) => state.setRegion);
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  const setSelectionMode = useBrowserStore((state) => state.setSelectionMode);
  const selectionHighlight = useBrowserStore((state) => state.selectionHighlight);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const highlights = useBrowserStore((state) => state.highlights);

  return (
    <SelectRegion
      svg={svg}
      marginWidth={marginWidth}
      trackWidth={trackWidth}
      totalHeight={totalHeight}
      region={region}
      setRegion={setRegion}
      disabled={isInteractionBlocked}
      mode={selectionMode}
      onModeChange={setSelectionMode}
      highlightStyle={selectionHighlight}
      onHighlight={addHighlight}
      highlights={highlights}
    >
      {children}
    </SelectRegion>
  );
}
