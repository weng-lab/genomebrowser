import {
  createElement,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { useTrackRuntimeContext } from "../../modules/trackRuntimeState";
import { useSvgPoint } from "../svg/useSvgPoint";
import { useRegistry, useTooltipStore } from "../state/browserContextState";
import { usePanDragStatus } from "../viewport/useBrowserPan";
import type { TrackTooltipComponent } from "../../modules/types";
import { CompositeTooltipContext } from "./compositeTooltipState";
import type { MousePosition } from "./types";

export function useTooltip<Item, Config>() {
  const owner = useId();
  const composite = use(CompositeTooltipContext);
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

  const latest = useRef({ Tooltip, context });
  useLayoutEffect(() => {
    latest.current = { Tooltip, context };
  });

  /** Register an SVG hit target so covered children can contribute overlay tooltips. */
  const target = useCallback(
    <ElementType extends SVGElement>(
      getItem: (position: MousePosition, element: ElementType, hit: Element) => Item | undefined,
    ) =>
      (element: ElementType | null) => {
        if (!element || !composite) return;
        return composite.register(element, {
          trackId: context.base.id,
          content: (position, hit) => {
            const item = getItem(position, element, hit);
            const { Tooltip, context } = latest.current;
            return item !== undefined && Tooltip
              ? createElement(Tooltip, { item, context })
              : undefined;
          },
        });
      },
    [composite, context.base.id],
  );

  const hide = () => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    hideTooltip(owner);
  };

  const show = (item: Item, position: MousePosition) => {
    if (composite?.enabled) return;
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

  return { hide, show, target };
}
