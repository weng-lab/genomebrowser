import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import useBrowserScale from "../../hooks/useBrowserScale";
import { useBrowserStore } from "../../store/browserStore";
import { useTrackStore } from "../../store/tracksStore";

function SwapTrack({ id, children, setSwapping }: { id: string; children: React.ReactNode; setSwapping: (swapping: boolean) => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [delta, setDelta] = useState(0);
  const nodeRef = useRef<SVGGElement>(null);
  const scale = useBrowserScale();

  const shiftTracks = useTrackStore((state) => state.shiftTracks);
  const getDistances = useTrackStore((state) => state.getDistances);
  const getPrevHeights = useTrackStore((state) => state.getPrevHeights);

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
      onDrag={(e, d) => handleDrag(e, d)}
      onStop={handleStop}
    >
      <g id={`swap-track-${id}`} ref={nodeRef}>
        {!dragging ? children : <Clone position={getPrevHeights(id) + position.y}>{children}</Clone>}
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
