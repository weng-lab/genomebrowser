import { trackOverlayContext } from "../track-overlay/context";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import { useContextMenuStore } from "../state/browserContextState";
import { PanTrack } from "./PanTrack";
import { TrackControls } from "./TrackControls";
import { getTrackTitleMargin, getTrackWrapperHeight } from "./trackLayout";
import { useTrackStack } from "./trackStackContext";

export function TrackFrame({
  track,
  y,
  previewOffsetY,
  contentX,
  contentWidth,
  limitsDrag,
  onSwapPointerDown,
  swapping = false,
  isDragClone = false,
  disableHover,
  children,
}: {
  track: AnyTrackInstance;
  y: number;
  previewOffsetY: number;
  /** Where the content group sits before any drag. */
  contentX: number;
  contentWidth: number;
  /** Whether the content is loaded data that a drag must not scroll past. */
  limitsDrag: boolean;
  onSwapPointerDown?: (event: React.PointerEvent<SVGRectElement>) => void;
  swapping?: boolean;
  isDragClone?: boolean;
  disableHover: boolean;
  children: React.ReactNode;
}) {
  const { marginWidth, trackWidth, titleSize, registerContentGroup, panDrag } = useTrackStack();
  const [overlayTarget, setOverlayTarget] = useState<SVGGElement | null>(null);
  const overlayContext = useMemo(
    () => ({ target: overlayTarget, width: trackWidth, height: track.base.height }),
    [overlayTarget, trackWidth, track.base.height],
  );
  const [hover, setHover] = useState(false);
  const contentGroupRef = useRef<SVGGElement>(null);
  const wrapperHeight = getTrackWrapperHeight(track, titleSize);
  const titleMargin = getTrackTitleMargin(track, titleSize);
  const contentClipId = useId();
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);
  const showHover = hover && !disableHover;

  // Registration owns the content transform so drag frames can move it without
  // a render. A layout effect paints a new position in the same frame as its data.
  useLayoutEffect(() => {
    if (isDragClone || !contentGroupRef.current) return;
    return registerContentGroup(contentGroupRef.current, {
      x: contentX,
      width: limitsDrag ? contentWidth : undefined,
    });
  }, [contentWidth, contentX, isDragClone, limitsDrag, registerContentGroup]);

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
        fill={isDragClone ? "#ffffff" : "transparent"}
        onContextMenu={handleContextMenu}
      />
      <g clipPath={`url(#${contentClipId})`} onContextMenu={handleContextMenu}>
        <g ref={contentGroupRef} transform={isDragClone ? `translate(${contentX},0)` : undefined}>
          <g transform={`translate(0,${titleMargin})`}>
            <PanTrack panDrag={panDrag} width={contentWidth} height={track.base.height}>
              <trackOverlayContext.Provider value={overlayContext}>
                {children}
              </trackOverlayContext.Provider>
            </PanTrack>
          </g>
        </g>
        <g
          ref={setOverlayTarget}
          transform={`translate(${marginWidth},${titleMargin})`}
          pointerEvents="none"
        />
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
