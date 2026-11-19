import type { MountedTrack } from "../mountTrack";

/**
 * Moves the pointer to `clientX` over a signal renderer's hover surface, laid out
 * across `width` pixels, and returns the tooltip text the browser shows.
 */
export function hoverSignal(view: MountedTrack, clientX: number, width: number) {
  const overlay = view.content.querySelector<SVGRectElement>('rect[pointer-events="all"]');
  if (!overlay) throw new Error("Could not find the hover overlay");
  overlay.getBoundingClientRect = () => new DOMRect(0, 0, width, 40);
  return view.move(overlay, { clientX });
}

/**
 * The x of the hover line the renderer draws at the hovered pixel. Signal renderers
 * draw it black, so tests give their tracks other colors to keep it the only black line.
 */
export function hoverLine(view: MountedTrack) {
  const lines = view.content.querySelectorAll('line[stroke="#000000"]');
  if (lines.length > 1) throw new Error(`Expected one hover line, found ${lines.length}`);
  return lines[0]?.getAttribute("x1");
}
