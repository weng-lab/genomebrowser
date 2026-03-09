import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import useBrowserScale from "../../../hooks/useBrowserScale";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import { RULER_HEIGHT } from "../ruler/ruler";

interface SwapTrackProps {
  id: string;
  children: React.ReactNode;
  distances: number[];
  height: number;
  layoutY: number;
  setSwapping: (swapping: boolean) => void;
  width: number;
}

export default function SwapTrack({ children, distances, height, id, layoutY, setSwapping, width }: SwapTrackProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [delta, setDelta] = useState(0);
  const nodeRef = useRef<SVGGElement>(null);
  const scale = useBrowserScale();

  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const getTrackIndex = useTrackStore((state) => state.getTrackIndex);
  const shiftTracks = useTrackStore((state) => state.shiftTracks);

  const handleDrag = (e: DraggableEvent, d: DraggableData) => {
    e.preventDefault();
    setDragging(true);
    setSwapping(true);
    setPosition({ x: 0, y: d.y });
    setDelta(d.y);
  };

  const handleStop = () => {
    setPosition({ x: 0, y: 0 });
    setDragging(false);
    setSwapping(false);
    if (Math.abs(delta) <= 5) return;

    const closestIndex = distances.reduce((prevIndex, currDistance, currIndex) => {
      return Math.abs(currDistance - delta) < Math.abs(distances[prevIndex] - delta) ? currIndex : prevIndex;
    }, 0);

    if (closestIndex === getTrackIndex(id)) return;

    shiftTracks(id, closestIndex);
    setDelta(0);
  };

  return (
    <Draggable
      scale={scale}
      position={position}
      axis="y"
      handle=".swap-handle"
      nodeRef={nodeRef as unknown as React.RefObject<HTMLElement>}
      onStart={() => {}}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <g id={`swap-track-${id}`} ref={nodeRef}>
        {dragging ? (
          <Clone height={height} margin={marginWidth} position={layoutY + position.y + RULER_HEIGHT} width={width}>
            {children}
          </Clone>
        ) : (
          children
        )}
      </g>
    </Draggable>
  );
}

function Clone({
  children,
  height,
  margin,
  position,
  width,
}: {
  children: React.ReactNode;
  height: number;
  margin: number;
  position: number;
  width: number;
}) {
  const browserRef = useBrowserStore((state) => state.svgRef);
  const scale = useBrowserScale();
  const nodeRef = useRef<SVGGElement>(null);

  return createPortal(
    <Draggable
      nodeRef={nodeRef as unknown as React.RefObject<HTMLElement>}
      scale={scale}
      position={{ x: 0, y: position }}
    >
      <g ref={nodeRef} style={{ cursor: "grabbing", filter: "drop-shadow(2px 2px 2px gray)" }}>
        <rect transform={`translate(${margin}, 0)`} width={width} height={height} fill="white" />
        {children}
      </g>
    </Draggable>,
    browserRef!.current!
  );
}
