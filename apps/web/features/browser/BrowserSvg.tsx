"use client";

import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";

const BrowserSvgContext = createContext<RefObject<SVGSVGElement | null> | null>(null);

/**
 * Holds the open browser's `<svg>` so features outside the browser view, such as
 * agent commands, can export it. The workspace renders at most one browser.
 */
export function BrowserSvgProvider({ children }: { children: ReactNode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  return <BrowserSvgContext value={svgRef}>{children}</BrowserSvgContext>;
}

/** The ref to pass to the GenomeBrowser's `svgRef`; `current` is null while no browser renders. */
export function useBrowserSvgRef() {
  const svgRef = useContext(BrowserSvgContext);
  if (!svgRef) throw new Error("useBrowserSvgRef must be used inside BrowserSvgProvider.");
  return svgRef;
}
