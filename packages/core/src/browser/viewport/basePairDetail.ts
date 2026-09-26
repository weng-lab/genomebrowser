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

/** Browser-level eligibility; individual tracks still need a suitable display and data. */
export type BasePairDetailStatus = Readonly<{
  reason: "ready" | "viewport" | "width";
  /** Span that satisfies both the bp cutoff and width entry guard, or null if one base cannot fit. */
  zoomTargetBases: number | null;
}>;

export function getBasePairDetailStatus(
  visible: boolean,
  eligible: boolean,
  width: number,
  maxVisibleBases: number,
): BasePairDetailStatus {
  const target = Math.min(maxVisibleBases, Math.floor(width / ENTER_PIXELS_PER_BASE));
  return {
    reason: visible ? "ready" : eligible ? "width" : "viewport",
    zoomTargetBases: target >= 1 ? target : null,
  };
}

type BasePairDetailSource = {
  subscribe: (listener: () => void) => () => void;
  getBasePairDetail: () => boolean;
  getBasePairDetailStatus: () => BasePairDetailStatus;
};

export const BasePairDetailContext = createContext<BasePairDetailSource | null>(null);

/** The hosting browser's shared, width-buffered decision to draw base-pair detail. */
export function useBasePairDetail(): boolean {
  const source = use(BasePairDetailContext);
  if (!source) throw new Error("useBasePairDetail must be used within a GenomeBrowser");
  return useSyncExternalStore(source.subscribe, source.getBasePairDetail, source.getBasePairDetail);
}

/** Explain the shared gate and obtain a zoom target using the actual mounted plot width. */
export function useBasePairDetailStatus(): BasePairDetailStatus {
  const source = use(BasePairDetailContext);
  if (!source) throw new Error("useBasePairDetailStatus must be used within a GenomeBrowser");
  return useSyncExternalStore(
    source.subscribe,
    source.getBasePairDetailStatus,
    source.getBasePairDetailStatus,
  );
}
