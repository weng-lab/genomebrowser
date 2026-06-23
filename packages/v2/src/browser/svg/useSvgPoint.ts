import { svgPoint } from "../../modules/utils/svg";
import { useBrowserSvg } from "./BrowserSvgContext";

export function useSvgPoint() {
  const svg = useBrowserSvg();
  return (clientX: number, clientY: number) => (svg ? svgPoint(svg, clientX, clientY) : null);
}
