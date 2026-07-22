import { createElement, useEffect, useEffectEvent, useId, useRef } from "react";
import { useTrackRuntimeContext } from "../../modules/runtimeContextState";
import { useSvgPoint } from "../svg/useSvgPoint";
import {
  useInternalTooltipStore,
  useTooltipComponent,
  useTooltipDisabled,
} from "./tooltipContextState";
import type { MousePosition } from "./types";

export function useTooltip<Item, Config>() {
  const owner = useId();
  const showTooltip = useInternalTooltipStore((state) => state.show);
  const hideTooltip = useInternalTooltipStore((state) => state.hide);
  const isDisabled = useTooltipDisabled();
  const context = useTrackRuntimeContext<Config>();
  const Tooltip = useTooltipComponent<Item, Config>(context.type);
  const getSvgPoint = useSvgPoint();
  const frameRef = useRef<number | undefined>(undefined);

  const hide = () => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    hideTooltip(owner);
  };

  const show = (item: Item, position: MousePosition) => {
    if (isDisabled()) {
      hide();
      return;
    }
    if (!Tooltip) return;

    const content = createElement(Tooltip, { item, context });
    const point = getSvgPoint(position.clientX, position.clientY);
    const anchor = point ?? { x: position.clientX, y: position.clientY };

    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      showTooltip(owner, content, anchor);
    });
  };

  const hideOnUnmount = useEffectEvent(hide);
  useEffect(() => () => hideOnUnmount(), []);

  return { hide, show };
}
