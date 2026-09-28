import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AnyTrackInstance } from "../../modules/types";
import { useTooltipStore } from "../state/browserContextState";
import { useSvgPoint } from "../svg/useSvgPoint";
import { usePanDragStatus } from "../viewport/useBrowserPan";
import { CompositeTooltipContext, type TooltipTarget } from "./compositeTooltipState";
import type { MousePosition, TooltipEntry } from "./types";

/** Collects tooltip content without dispatching events to covered child tracks. */
export function CompositeTooltip({
  enabled,
  tracks,
  children,
}: {
  enabled: boolean;
  tracks: readonly AnyTrackInstance[];
  children: ReactNode;
}) {
  const owner = useId();
  const show = useTooltipStore((state) => state.show);
  const hide = useTooltipStore((state) => state.hide);
  const isDragging = usePanDragStatus();
  const getSvgPoint = useSvgPoint();
  const [targets] = useState(() => new WeakMap<Element, TooltipTarget>());
  const frame = useRef<number | undefined>(undefined);
  const register = useCallback(
    (element: Element, target: TooltipTarget) => {
      targets.set(element, target);
      return () => {
        targets.delete(element);
        // React replaces inline ref callbacks during ordinary hover renders. Wait
        // for the commit to finish so reattaching the same element keeps its tooltip.
        queueMicrotask(() => {
          if (!targets.has(element) && frame.current === undefined) hide(owner);
        });
      };
    },
    [targets, hide, owner],
  );
  const context = useMemo(() => ({ enabled, register }), [enabled, register]);
  const dismiss = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    hide(owner);
  };
  const dismissOnChange = useEffectEvent(dismiss);
  useEffect(() => {
    dismissOnChange();
    return () => dismissOnChange();
  }, [enabled, tracks]);

  useEffect(() => {
    const dismiss = () => dismissOnChange();
    window.addEventListener("blur", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);

  const move = (position: MousePosition, document: Document) => {
    if (!enabled) return;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    if (isDragging()) {
      dismiss();
      return;
    }
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      if (isDragging()) return;
      const content = new Map<string, TooltipEntry>();
      // The browser supplies exact SVG hit testing, including transforms, strokes,
      // clipping and covered elements, in front-to-back paint order.
      for (const hit of document.elementsFromPoint(position.clientX, position.clientY)) {
        for (let element: Element | null = hit; element; element = element.parentElement) {
          const target = targets.get(element);
          if (!target || content.has(target.trackId)) continue;
          const item = target.content(position, hit);
          if (item) content.set(target.trackId, { trackId: target.trackId, content: item });
          break;
        }
      }
      const entries = tracks.toReversed().flatMap((track) => {
        const entry = content.get(track.base.id);
        return entry ? [entry] : [];
      });
      if (!entries.length) {
        hide(owner);
        return;
      }
      const anchor = getSvgPoint(position.clientX, position.clientY) ?? {
        x: position.clientX,
        y: position.clientY,
      };
      show(owner, entries, anchor);
    });
  };
  return (
    <CompositeTooltipContext value={context}>
      <g
        onMouseMoveCapture={(event) =>
          move(
            { clientX: event.clientX, clientY: event.clientY },
            event.currentTarget.ownerDocument,
          )
        }
        onMouseLeave={dismiss}
        onPointerDownCapture={dismiss}
        onPointerCancel={dismiss}
        onWheelCapture={dismiss}
      >
        {children}
      </g>
    </CompositeTooltipContext>
  );
}
