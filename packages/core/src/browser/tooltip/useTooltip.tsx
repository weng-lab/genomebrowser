import { createElement, useEffect, useEffectEvent, useId, useRef } from "react";
import { useTrackRuntimeContext } from "../../modules/trackRuntimeState";
import { useSvgPoint } from "../svg/useSvgPoint";
import { useRegistry, useTooltipStore } from "../state/browserContextState";
import { usePanDragStatus } from "../viewport/useBrowserPan";
import type { TrackTooltipComponent } from "../../modules/types";
import type { MousePosition } from "./types";

export function useTooltip<Item, Config>() {
  const owner = useId();
  const showTooltip = useTooltipStore((state) => state.show);
  const hideTooltip = useTooltipStore((state) => state.hide);
  const panDragStatus = usePanDragStatus();
  const context = useTrackRuntimeContext<Config>();
  const module = useRegistry().get(context.type);
  const Tooltip = (module.kind === "track" ? module.tooltipComponent : undefined) as
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
    if (panDragStatus()) {
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
