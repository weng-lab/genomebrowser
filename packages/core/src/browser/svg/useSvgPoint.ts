import { svgPoint } from "../../modules/utils/svg";
import { useBrowserSvg } from "./browserSvgState";

export function useSvgPoint() {
  const svg = useBrowserSvg();
  return (clientX: number, clientY: number) => (svg ? svgPoint(svg, clientX, clientY) : null);
}
