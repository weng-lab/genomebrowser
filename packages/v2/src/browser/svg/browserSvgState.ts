import { createContext, use } from "react";

export const BrowserSvgContext = createContext<SVGSVGElement | null | undefined>(undefined);

export function useBrowserSvg() {
  const svg = use(BrowserSvgContext);
  if (svg === undefined) throw new Error("useBrowserSvg must be used within a GenomeBrowser");
  return svg;
}
