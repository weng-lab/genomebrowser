import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import useBrowserScale from "../../hooks/useBrowserScale";
import { useBrowserStore } from "../../store/browserStore";
import { useTrackStore } from "../../store/trackStore";

function SwapTrack({
  id,
  children,
  setSwapping,
}: {
  id: string;
  children: React.ReactNode;
  setSwapping: (swapping: boolean) => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [delta, setDelta] = useState(0);
  const nodeRef = useRef<SVGGElement>(null);
  const scale = useBrowserScale();

  const shiftTracks = useTrackStore((state) => state.shiftTracks);
  const getDistances = useTrackStore((state) => state.getDistances);
  const getTrackIndex = useTrackStore((state) => state.getTrackIndex);
  const prevHeights = useTrackStore((state) => state.getPrevHeights(id));

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
    const distances = getDistances(id);
    const closestIndex = distances.reduce((prevIndex, currDistance, currIndex) => {
      return Math.abs(currDistance - delta) < Math.abs(distances[prevIndex] - delta) ? currIndex : prevIndex;
    }, 0);
    const index = getTrackIndex(id);
    if (closestIndex === index) return;
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
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <g id={`swap-track-${id}`} ref={nodeRef}>
        {dragging ? <Clone position={prevHeights + position.y}>{children}</Clone> : children}
      </g>
    </Draggable>
  );
}

function Clone({ children, position }: { children: React.ReactNode; position: number }) {
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
        {children}
      </g>
    </Draggable>,
    browserRef!.current!
  );
}

export default SwapTrack;
