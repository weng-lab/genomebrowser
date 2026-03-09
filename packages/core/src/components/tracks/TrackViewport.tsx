import ClipPath from "../svg/clipPath";
import type { TrackDimensions } from "./types";

interface TrackViewportProps {
  id: string;
  height: number;
  dimensions: TrackDimensions;
  children: React.ReactNode;
  onMouseMove?: React.MouseEventHandler<SVGRectElement>;
  onMouseOut?: React.MouseEventHandler<SVGRectElement>;
}

export default function TrackViewport({
  id,
  height,
  dimensions,
  children,
  onMouseMove,
  onMouseOut,
}: TrackViewportProps) {
  const { totalWidth, sideWidth, viewWidth } = dimensions;
  const clipPathId = `track-viewport-${id}`;

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${clipPathId})`} transform={`translate(-${sideWidth}, 0)`}>
      <defs>
        <ClipPath id={clipPathId} width={totalWidth} height={height} />
      </defs>
      {children}
      {(onMouseMove || onMouseOut) && (
        <rect
          width={viewWidth}
          height={height}
          transform={`translate(${sideWidth}, 0)`}
          fill="transparent"
          onMouseMove={onMouseMove}
          onMouseOut={onMouseOut}
        />
      )}
    </g>
  );
}
