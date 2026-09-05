import { useEffect, useId, useRef, useState } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import { useContextMenuStore } from "../state/browserContextState";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { PanTrack } from "./PanTrack";
import { TrackControls } from "./TrackControls";
import { getTrackTitleMargin, getTrackWrapperHeight } from "./trackLayout";

export function TrackFrame({
  track,
  y,
  previewOffsetY = 0,
  marginWidth,
  trackWidth,
  contentX = marginWidth,
  contentWidth = trackWidth,
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
  track: AnyTrackInstance;
  y: number;
  previewOffsetY?: number;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  contentWidth?: number;
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
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);
  const showHover = hover && !disableHover;

  useEffect(() => {
    if (isDragClone || !registerContentGroup || !contentGroupRef.current) return;
    return registerContentGroup(contentGroupRef.current);
  }, [isDragClone, registerContentGroup]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    openContextMenu(track.base.id, { x: event.clientX, y: event.clientY });
  };

  return (
    <g transform={`translate(0,${y + previewOffsetY})`}>
      <defs>
        <clipPath id={contentClipId}>
          <rect x={marginWidth} y={titleMargin} width={trackWidth} height={track.base.height} />
        </clipPath>
      </defs>
      <rect
        x={marginWidth}
        y={0}
        width={trackWidth}
        height={wrapperHeight}
        fill="#ffffff"
        onContextMenu={handleContextMenu}
      />
      <g clipPath={`url(#${contentClipId})`} onContextMenu={handleContextMenu}>
        <g ref={contentGroupRef} transform={`translate(${contentX},0)`}>
          <g transform={`translate(0,${titleMargin})`}>
            <PanTrack
              panDrag={panDrag}
              disabled={isPanLocked}
              width={contentWidth}
              height={track.base.height}
            >
              {children}
            </PanTrack>
          </g>
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
        {`${track.base.title} (${track.base.display})`}
      </text>
      <g
        onMouseEnter={() => {
          if (!disableHover) setHover(true);
        }}
        onMouseLeave={() => setHover(false)}
      >
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
          fill={track.base.color}
        />
        <TrackControls track={track} marginWidth={marginWidth} wrapperHeight={wrapperHeight} />
        <line stroke="#cccccc" x1={marginWidth} x2={marginWidth} y1={0} y2={wrapperHeight} />
      </g>
      {showHover && (
        <rect
          width={marginWidth + trackWidth}
          height={wrapperHeight}
          fill={track.base.color}
          fillOpacity={0.25}
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  );
}
