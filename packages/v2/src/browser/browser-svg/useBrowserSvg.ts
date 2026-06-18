import { use } from "react";
import { BrowserSvgContext } from "./BrowserSvgProvider";

export function useBrowserSvg() {
  const svg = use(BrowserSvgContext);
  if (svg === undefined) throw new Error("useBrowserSvg must be used within a GenomeBrowser");
  return svg;
}
