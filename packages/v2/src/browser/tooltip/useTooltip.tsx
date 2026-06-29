import { createElement, useRef } from "react";
import { useSvgPoint } from "../svg/useSvgPoint";
import { useInternalTooltipStore, useTooltipComponent, useTooltipDisabled } from "./TooltipContext";
import type { MousePosition } from "./types";

export function useTooltip<Item, Config>({ type, config }: { type: string; config: Config }) {
  const showTooltip = useInternalTooltipStore((state) => state.show);
  const hideTooltip = useInternalTooltipStore((state) => state.hide);
  const isDisabled = useTooltipDisabled();
  const Tooltip = useTooltipComponent<Item, Config>(type);
  const getSvgPoint = useSvgPoint();
  const frameRef = useRef<number | undefined>(undefined);

  const hide = () => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    hideTooltip();
  };

  const show = (item: Item, position: MousePosition) => {
    if (isDisabled()) {
      hide();
      return;
    }
    if (!Tooltip) return;

    const content = createElement(Tooltip, { item, config });
    const point = getSvgPoint(position.clientX, position.clientY);
    const anchor = point ?? { x: position.clientX, y: position.clientY };

    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      showTooltip(content, anchor);
    });
  };

  return { hide, show };
}
