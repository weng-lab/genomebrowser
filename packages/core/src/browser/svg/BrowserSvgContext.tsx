import type { ReactNode } from "react";
import { BrowserSvgContext } from "./browserSvgState";

export function BrowserSvgProvider({
  children,
  svg,
}: {
  children: ReactNode;
  svg: SVGSVGElement | null;
}) {
  return <BrowserSvgContext.Provider value={svg}>{children}</BrowserSvgContext.Provider>;
}
