import { useEffect, useId, useRef, useState } from "react";
import type { TrackConfigBase } from "../../modules/types";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { TrackControls } from "./TrackControls";
import { getTrackTitleMargin, getTrackWrapperHeight } from "./trackLayout";

export function TrackFrame({
  track,
  y,
  previewOffsetY = 0,
  marginWidth,
  trackWidth,
  contentX = marginWidth,
  registerContentGroup,
  panDrag,
  isPanLocked = false,
  onSwapMouseDown,
  swapping = false,
  isDragClone = false,
  disableHover = false,
  titleSize,
  children,
}: {
  track: TrackConfigBase;
  y: number;
  previewOffsetY?: number;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  panDrag?: PanDragHandlers;
  isPanLocked?: boolean;
  onSwapMouseDown?: (event: React.MouseEvent<SVGRectElement>) => void;
  swapping?: boolean;
  isDragClone?: boolean;
  disableHover?: boolean;
  titleSize: number;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const contentGroupRef = useRef<SVGGElement>(null);
  const wrapperHeight = getTrackWrapperHeight(track, titleSize);
  const titleMargin = getTrackTitleMargin(track, titleSize);
  const contentClipId = useId();

  if (disableHover && hover) {
    setHover(false);
  }

  useEffect(() => {
    if (isDragClone || !registerContentGroup || !contentGroupRef.current) return;
    return registerContentGroup(contentGroupRef.current);
  }, [isDragClone, registerContentGroup]);

  return (
    <g
      transform={`translate(0,${y + previewOffsetY})`}
      onMouseMove={() => {
        if (!disableHover) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
    >
      <defs>
        <clipPath id={contentClipId}>
          <rect x={marginWidth} y={titleMargin} width={trackWidth} height={track.height} />
        </clipPath>
      </defs>
      <rect x={marginWidth} y={0} width={trackWidth} height={wrapperHeight} fill="#ffffff" />
      {panDrag && (
        <rect
          x={marginWidth}
          y={titleMargin}
          width={trackWidth}
          height={track.height}
          fill="transparent"
          pointerEvents="all"
          style={{ cursor: isPanLocked ? "default" : panDrag.isDragging ? "grabbing" : "grab" }}
          onPointerDown={panDrag.onPointerDown}
          onPointerMove={panDrag.onPointerMove}
          onPointerUp={panDrag.onPointerUp}
          onPointerCancel={panDrag.onPointerCancel}
        />
      )}
      <g clipPath={`url(#${contentClipId})`}>
        <g ref={contentGroupRef} transform={`translate(${contentX},0)`}>
          <g transform={`translate(0,${titleMargin})`}>{children}</g>
        </g>
      </g>
      <text
        fill="#000000"
        x={marginWidth + trackWidth / 2}
        y={titleSize / 2 + 5}
        fontSize={`${titleSize}px`}
        textAnchor="middle"
        alignmentBaseline="baseline"
      >
        {track.title}
      </text>
      <rect
        x={0}
        y={0}
        width={marginWidth}
        height={wrapperHeight}
        fill="#ffffff"
        onMouseDown={onSwapMouseDown}
        style={{ cursor: onSwapMouseDown ? (swapping ? "grabbing" : "grab") : "default" }}
      />
      <rect
        x={0}
        y={0}
        width={marginWidth / 15}
        height={wrapperHeight}
        stroke="#000000"
        strokeWidth={0.5}
        fill={track.color || "#ffffff"}
      />
      <TrackControls track={track} marginWidth={marginWidth} wrapperHeight={wrapperHeight} />
      <line stroke="#cccccc" x1={marginWidth} x2={marginWidth} y1={0} y2={wrapperHeight} />
      {hover && !disableHover && (
        <rect
          width={marginWidth + trackWidth}
          height={wrapperHeight}
          fill={track.color || "transparent"}
          fillOpacity={0.25}
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  );
}
