import { memo } from "react";
import { TrackLabel, TrackOverlay } from "@weng-lab/genomebrowser";

export const REPEAT_CLASS_LABEL_WIDTH = 100;
const LABEL_HEIGHT = 14;

/** Owns the fixed class label, its hover target, and the matching row highlight. */
export const RepeatClassLabel = memo(function RepeatClassLabel({
  category,
  top,
  height,
  highlightOnHover,
}: {
  category: string;
  top: number;
  height: number;
  highlightOnHover: boolean;
}) {
  if (height < LABEL_HEIGHT) return null;
  return (
    <>
      <TrackOverlay>
        {({ width }) => (
          <g
            data-repeatmasker-class-label={category}
            data-repeatmasker-class-hover={highlightOnHover}
          >
            <rect
              data-repeatmasker-band-highlight=""
              x={0}
              y={top}
              width={width}
              height={height}
              fill="#3b82f6"
              fillOpacity={0}
              pointerEvents="none"
            />
            <rect
              data-repeatmasker-label-hitbox=""
              x={0}
              y={top}
              width={Math.min(width, REPEAT_CLASS_LABEL_WIDTH)}
              height={LABEL_HEIGHT}
              fill="transparent"
              pointerEvents="all"
              aria-hidden="true"
            />
          </g>
        )}
      </TrackOverlay>
      <TrackLabel anchor="left" y={top + LABEL_HEIGHT / 2}>
        {category}
      </TrackLabel>
    </>
  );
});
