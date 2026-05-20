import { useEffect, useId, useRef, useState } from "react";
import type { TrackConfigBase } from "../modules/types";
import type { TrackStoreInstance } from "../stores/trackStore";
import { BottomIcon, TopIcon } from "./icons";

export function getTrackWrapperHeight(track: TrackConfigBase, titleSize: number) {
  return track.height + (track.title ? titleSize + 5 : 0);
}

export function getTrackTitleMargin(track: TrackConfigBase, titleSize: number) {
  return track.title ? titleSize + 5 : 0;
}

export function TrackFrame({
  track,
  y,
  marginWidth,
  trackWidth,
  contentX = marginWidth,
  registerContentGroup,
  titleSize,
  trackStore,
  children,
}: {
  track: TrackConfigBase;
  y: number;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  titleSize: number;
  trackStore: TrackStoreInstance;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const contentGroupRef = useRef<SVGGElement>(null);
  const order = trackStore((state) => state.order);
  const reorderTracks = trackStore((state) => state.reorderTracks);
  const wrapperHeight = getTrackWrapperHeight(track, titleSize);
  const titleMargin = getTrackTitleMargin(track, titleSize);
  const contentClipId = useId();
  const index = order.indexOf(track.id);
  const canMoveTop = index > 0;
  const canMoveBottom = index >= 0 && index < order.length - 1;

  const moveTrack = (target: "top" | "bottom") => {
    const nextOrder = order.filter((id) => id !== track.id);
    if (target === "top") nextOrder.unshift(track.id);
    if (target === "bottom") nextOrder.push(track.id);
    reorderTracks(nextOrder);
  };

  useEffect(() => {
    if (!registerContentGroup || !contentGroupRef.current) return;
    return registerContentGroup(contentGroupRef.current);
  }, [registerContentGroup]);

  return (
    <g
      transform={`translate(0,${y})`}
      onMouseMove={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <defs>
        <clipPath id={contentClipId}>
          <rect x={marginWidth} y={titleMargin} width={trackWidth} height={track.height} />
        </clipPath>
      </defs>
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
        style={{ cursor: "default" }}
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
      <g>
        <g
          onClick={canMoveTop ? () => moveTrack("top") : undefined}
          style={{ cursor: canMoveTop ? "pointer" : "default" }}
        >
          <circle
            cx={marginWidth / 10 + 7.5}
            cy={wrapperHeight / 2 + 10}
            r={7.5}
            strokeWidth={0}
            fill="transparent"
          />
          <TopIcon
            x={marginWidth / 10}
            y={wrapperHeight / 2 + 3}
            height={15}
            width={15}
            fill={canMoveTop ? "#000000" : "#cccccc"}
          />
        </g>
        <g
          onClick={canMoveBottom ? () => moveTrack("bottom") : undefined}
          style={{ cursor: canMoveBottom ? "pointer" : "default" }}
        >
          <circle
            cx={marginWidth / 10 + 22.5}
            cy={wrapperHeight / 2 + 10}
            r={7.5}
            strokeWidth={0}
            fill="transparent"
          />
          <BottomIcon
            x={marginWidth / 10 + 15}
            y={wrapperHeight / 2 + 2}
            height={15}
            width={15}
            fill={canMoveBottom ? "#000000" : "#cccccc"}
          />
        </g>
      </g>
      <line stroke="#cccccc" x1={marginWidth} x2={marginWidth} y1={0} y2={wrapperHeight} />
      {hover && (
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
