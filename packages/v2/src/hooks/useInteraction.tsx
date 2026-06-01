import { createElement, type MouseEvent } from "react";
import { DefaultTooltip } from "../browser/DefaultTooltip";
import type { TrackConfigBase, TrackInteractionConfig } from "../modules/types";
import { useBrowserSvg, useTooltipStore } from "../stores/BrowserContext";
import { svgPoint } from "../utils/svg";

export function useInteraction<Item, Config extends TrackConfigBase>({
  config,
  fallback,
}: {
  config: Config & TrackInteractionConfig<Item, Config>;
  fallback?: (item: Item) => string | undefined;
}) {
  const svg = useBrowserSvg();
  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);

  const handleClick = (item: Item, event: MouseEvent) => {
    config.onClick?.({ item, config, event });
  };

  const handleHover = (item: Item, event: MouseEvent) => {
    config.onHover?.({ item, config, event });

    const content = config.tooltip
      ? createElement(config.tooltip, { item, config })
      : getFallbackTooltip(item, fallback);
    if (!content) return;

    const point = svg ? svgPoint(svg, event.clientX, event.clientY) : null;
    showTooltip(content, point?.x ?? event.clientX, point?.y ?? event.clientY);
  };

  const handleLeave = (item: Item, event: MouseEvent) => {
    config.onLeave?.({ item, config, event });
    hideTooltip();
  };

  return { handleClick, handleHover, handleLeave };
}

function getFallbackTooltip<Item>(item: Item, fallback: ((item: Item) => string | undefined) | undefined) {
  const value = fallback?.(item);
  return value ? <DefaultTooltip value={value} /> : undefined;
}
