import { use, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { trackOverlayContext } from "./context";

export type TrackOverlayProps = {
  children: ReactNode | ((size: { width: number; height: number }) => ReactNode);
};

/** Places renderer-owned SVG content in the stationary plot overlay. */
export function TrackOverlay({ children }: TrackOverlayProps) {
  const context = use(trackOverlayContext);
  if (!context?.target) return null;
  return createPortal(
    <g pointerEvents="none">
      {typeof children === "function"
        ? children({ width: context.width, height: context.height })
        : children}
    </g>,
    context.target,
  );
}
