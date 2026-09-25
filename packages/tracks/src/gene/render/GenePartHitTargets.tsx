import { memo } from "react";
import type { GeneInteractionTarget } from "../interactions";
import type { PreparedGeneGlyph } from "./glyph/preparation";

export type GeneInteractionProps = (target: GeneInteractionTarget) => {
  style: { cursor: string };
  onClick: () => void;
  onMouseEnter: (event: React.MouseEvent<SVGElement>) => void;
  onMouseLeave: () => void;
};

/** Invisible rects over each intron and exon part, so hovering a part reports that part. */
export const GenePartHitTargets = memo(function GenePartHitTargets({
  prepared,
  x,
  width,
  rowTop,
  rowHeight,
  interactionProps,
}: {
  prepared: PreparedGeneGlyph;
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  interactionProps: GeneInteractionProps;
}) {
  return [...prepared.geometry.introns, ...prepared.geometry.exonParts].map((part) => {
    const start = Math.max(0, x(part.start));
    const end = Math.min(width, x(part.end));
    if (end <= 0 || start >= width || end <= start) return null;
    const target = prepared.targets.get(part.id);
    if (!target) return null;
    const handlers = interactionProps(target);
    return (
      <rect
        key={part.id}
        data-gene-part-hit-target=""
        data-gene-part-id={part.id}
        x={start}
        y={rowTop}
        width={Math.max(1, end - start)}
        height={rowHeight}
        fill="transparent"
        pointerEvents="all"
        style={handlers.style}
        onClick={handlers.onClick}
        onMouseEnter={handlers.onMouseEnter}
        onMouseLeave={handlers.onMouseLeave}
      />
    );
  });
});
