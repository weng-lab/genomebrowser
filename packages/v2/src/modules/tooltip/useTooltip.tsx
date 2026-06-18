import { createElement, useRef } from "react";
import type { TrackConfigBase, TrackTooltipComponent } from "../types";
import { svgPoint } from "../utils/svg";
import { useModuleRuntime } from "../runtime/ModuleRuntimeContext";
import { useInternalTooltipStore } from "./TooltipContext";
import type { MousePosition } from "./types";

export function useTooltip<Item, Config extends TrackConfigBase>({
  config,
}: {
  config: Config & { tooltip?: TrackTooltipComponent<Item, Config> };
}) {
  const showTooltip = useInternalTooltipStore((state) => state.show);
  const hideTooltip = useInternalTooltipStore((state) => state.hide);
  const { isPanning, svg } = useModuleRuntime();
  const frameRef = useRef<number | undefined>(undefined);

  const hide = () => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    hideTooltip();
  };

  const show = (item: Item, position: MousePosition) => {
    if (isPanning || !config.tooltip) return;

    const Tooltip = config.tooltip;
    const content = createElement(Tooltip, { item, config });
    const point = svg ? svgPoint(svg, position.clientX, position.clientY) : null;
    const anchor = point ?? { x: position.clientX, y: position.clientY };

    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      showTooltip(content, anchor);
    });
  };

  return { hide, show };
}
