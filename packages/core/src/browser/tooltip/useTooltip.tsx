import { createElement, useEffect, useEffectEvent, useId, useRef } from "react";
import { useTrackRuntimeContext } from "../../modules/trackRuntimeState";
import { useSvgPoint } from "../svg/useSvgPoint";
import { useIsPanDragging, useRegistry, useTooltipStore } from "../state/browserContextState";
import type { TrackTooltipComponent } from "../../modules/types";
import type { MousePosition } from "./types";

export function useTooltip<Item, Config>() {
  const owner = useId();
  const showTooltip = useTooltipStore((state) => state.show);
  const hideTooltip = useTooltipStore((state) => state.hide);
  const isDisabled = useIsPanDragging();
  const context = useTrackRuntimeContext<Config>();
  const Tooltip = useRegistry().get(context.type).tooltipComponent as
    | TrackTooltipComponent<Item, Config>
    | undefined;
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
