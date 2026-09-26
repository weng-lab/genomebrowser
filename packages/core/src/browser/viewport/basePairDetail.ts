import { createContext, use, useSyncExternalStore } from "react";

// Logical SVG units: text and cells scale together. A two-unit buffer prevents
// small resizes near the boundary from repeatedly switching representations.
const ENTER_PIXELS_PER_BASE = 8;
const EXIT_PIXELS_PER_BASE = 6;

export function basePairDetailVisible(
  eligible: boolean,
  width: number,
  span: number,
  wasVisible: boolean,
): boolean {
  return eligible && width / span >= (wasVisible ? EXIT_PIXELS_PER_BASE : ENTER_PIXELS_PER_BASE);
}

type BasePairDetailSource = {
  subscribe: (listener: () => void) => () => void;
  getBasePairDetail: () => boolean;
};

export const BasePairDetailContext = createContext<BasePairDetailSource | null>(null);

/** The hosting browser's shared, width-buffered decision to draw base-pair detail. */
export function useBasePairDetail(): boolean {
  const source = use(BasePairDetailContext);
  if (!source) throw new Error("useBasePairDetail must be used within a GenomeBrowser");
  return useSyncExternalStore(source.subscribe, source.getBasePairDetail, source.getBasePairDetail);
}
