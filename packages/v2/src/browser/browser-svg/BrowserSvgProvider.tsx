import { createContext, type ReactNode } from "react";

export const BrowserSvgContext = createContext<SVGSVGElement | null | undefined>(undefined);

export function BrowserSvgProvider({
  children,
  svg,
}: {
  children: ReactNode;
  svg: SVGSVGElement | null;
}) {
  return <BrowserSvgContext.Provider value={svg}>{children}</BrowserSvgContext.Provider>;
}
