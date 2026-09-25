import { useCallback, useLayoutEffect, useRef } from "react";
import type { GenomicRegion } from "../../genome/region";

/**
 * A content group's horizontal position without a drag. `width` is how far its
 * data extends from `x`; groups that report it limit how far a drag can go.
 */
export type ContentPlacement = { x: number; width?: number };

export type RegisterContentGroup = (node: SVGGElement, placement: ContentPlacement) => () => void;

/**
 * Owns the `transform` of every content group. Each group sits at its own base
 * X, and one shared drag offset moves them all together without React renders.
 * A drag stops where any group's data would stop covering the visible track;
 * `setContentOffset` returns the offset it applied.
 */
export function useContentTransform({
  region,
  marginWidth,
  trackWidth,
}: {
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
}) {
  const dragPxRef = useRef(0);
  const groupsRef = useRef(new Map<SVGGElement, ContentPlacement>());
  const viewRef = useRef({ marginWidth, trackWidth });
  useLayoutEffect(() => {
    viewRef.current = { marginWidth, trackWidth };
  }, [marginWidth, trackWidth]);

  const getContentOffset = useCallback(() => dragPxRef.current, []);

  const setContentOffset = useCallback((requestedDragPx: number) => {
    const dragPx = clampDrag(requestedDragPx, groupsRef.current.values(), viewRef.current);
    dragPxRef.current = dragPx;
    for (const [node, placement] of groupsRef.current) writeTransform(node, placement.x + dragPx);
    return dragPx;
  }, []);

  const registerContentGroup = useCallback<RegisterContentGroup>((node, placement) => {
    groupsRef.current.set(node, placement);
    writeTransform(node, placement.x + dragPxRef.current);
    return () => {
      groupsRef.current.delete(node);
    };
  }, []);

  // A committed pan moves the view by the dragged distance, so every group's
  // new base X already includes it. Reset the drag before paint so both land
  // in the same frame.
  useLayoutEffect(() => {
    setContentOffset(0);
  }, [region, setContentOffset]);

  return {
    getContentOffset,
    setContentOffset,
    registerContentGroup,
  };
}

function writeTransform(node: SVGGElement, x: number) {
  node.setAttribute("transform", `translate(${x},0)`);
}

function clampDrag(
  dragPx: number,
  placements: Iterable<ContentPlacement>,
  { marginWidth, trackWidth }: { marginWidth: number; trackWidth: number },
) {
  // Dragging right is limited by the data's left edge, dragging left by its right edge.
  let max = Number.POSITIVE_INFINITY;
  let min = Number.NEGATIVE_INFINITY;
  for (const { x, width } of placements) {
    if (width === undefined) continue;
    max = Math.min(max, Math.max(0, marginWidth - x));
    min = Math.max(min, Math.min(0, marginWidth + trackWidth - (x + width)));
  }
  return Math.min(max, Math.max(min, dragPx));
}
