import { createContext, use, type ReactNode } from "react";

const BrowserSvgContext = createContext<SVGSVGElement | null | undefined>(undefined);

export function BrowserSvgProvider({
  children,
  svg,
}: {
  children: ReactNode;
  svg: SVGSVGElement | null;
}) {
  return <BrowserSvgContext.Provider value={svg}>{children}</BrowserSvgContext.Provider>;
}

export function useBrowserSvg() {
  const svg = use(BrowserSvgContext);
  if (svg === undefined) throw new Error("useBrowserSvg must be used within a GenomeBrowser");
  return svg;
}
