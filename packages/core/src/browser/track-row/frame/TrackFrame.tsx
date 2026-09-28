import { useState } from "react";
import type { AnyTrackInstance } from "../../../modules/types";
import { useContextMenuStore } from "../../state/browserContextState";
import { PanTrack } from "./PanTrack";
import { TrackControls } from "./TrackControls";
import {
  getTrackTitleMargin,
  getTrackWrapperHeight,
  getTrackPlotHeight,
} from "../layout/trackLayout";
import { useTrackStack } from "../trackStackContext";

export function TrackFrame({
  track,
  y,
  previewOffsetY,
  onSwapPointerDown,
  swapping = false,
  isDragClone = false,
  disableHover,
  children,
}: {
  track: AnyTrackInstance;
  y: number;
  previewOffsetY: number;
  onSwapPointerDown?: (event: React.PointerEvent<SVGRectElement>) => void;
  swapping?: boolean;
  isDragClone?: boolean;
  disableHover: boolean;
  children: React.ReactNode;
}) {
  const { marginWidth, trackWidth, titleSize, panDrag } = useTrackStack();
  const [hover, setHover] = useState(false);
  const plotHeight = getTrackPlotHeight(track);
  const wrapperHeight = getTrackWrapperHeight(track, titleSize);
  const titleMargin = getTrackTitleMargin(track, titleSize);
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);
  const showHover = hover && !disableHover;

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    openContextMenu(track.base.id, { x: event.clientX, y: event.clientY });
  };

  return (
    <g transform={`translate(0,${y + previewOffsetY})`}>
      <rect
        x={marginWidth}
        y={0}
        width={trackWidth}
        height={wrapperHeight}
        fill={isDragClone ? "#ffffff" : "transparent"}
        onContextMenu={handleContextMenu}
      />
      <g
        transform={`translate(0,${titleMargin})`}
        onContextMenu={handleContextMenu}
        data-plot-height={plotHeight}
      >
        {children}
      </g>
      <g transform={`translate(${marginWidth},0)`} onContextMenu={handleContextMenu}>
        <PanTrack panDrag={panDrag} width={trackWidth} height={titleMargin}>
          <text
            fill="#000000"
            x={trackWidth / 2}
            y={titleSize / 2 + 5}
            fontSize={`${titleSize}px`}
            textAnchor="middle"
            alignmentBaseline="baseline"
          >
            {`${track.base.title} (${track.base.display})`}
          </text>
        </PanTrack>
      </g>
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
          onPointerDown={onSwapPointerDown}
          style={{
            cursor: onSwapPointerDown ? (swapping ? "grabbing" : "grab") : "default",
            touchAction: onSwapPointerDown ? "none" : "auto",
          }}
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
