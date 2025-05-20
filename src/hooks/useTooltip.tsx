import { ReactElement } from "react";
import { useBrowserStore } from "../store/browserStore";
import { svgPoint } from "../utils/svg";
import { useTooltipStore } from "../store/tooltipStore";

export function useTooltip() {
  const svgRef = useBrowserStore((state) => state.svgRef);
  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const width = useBrowserStore((state) => state.browserWidth);

  const show = (e: React.MouseEvent<SVGElement>, content: ReactElement) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    const x = pos[0] > width - 100 ? pos[0] - 100 : pos[0] + 10;
    const y = pos[1] + 10;
    showTooltip(content, x, y);
  };
  return { show, hide: hideTooltip };
}
