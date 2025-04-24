import React, { useRef, useState } from "react";
import useBrowserScale from "./useBrowserScale";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { createPortal } from "react-dom";
import { useBrowserStore } from "./browserStore";

function SwapTrack({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const nodeRef = useRef<SVGGElement>(null);
  const scale = useBrowserScale();

  const handleDrag = (e: DraggableEvent, d: DraggableData) => {
    setDragging(true);
    setPosition({ x: 0, y: d.y });
  };

  const handleStop = () => {
    setPosition({ x: 0, y: 0 });
    setDragging(false);
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
      <g ref={nodeRef}>
        {!dragging ? (
          children
        ) : (
          <Clone scale={scale} position={position}>
            {children}
          </Clone>
        )}
      </g>
    </Draggable>
  );
}

function Clone({
  scale,
  children,
  position,
}: {
  scale: number;
  children: React.ReactNode;
  position: { x: number; y: number };
}) {
  const browserRef = useBrowserStore((state) => state.svgRef);
  const nodeRef = useRef<SVGGElement>(null);
  return createPortal(
    <Draggable nodeRef={nodeRef as unknown as React.RefObject<HTMLElement>} scale={scale} position={position}>
      <g ref={nodeRef} style={{ cursor: "grabbing", filter: "drop-shadow(2px 2px 2px gray)" }}>
        {children}
      </g>
    </Draggable>,
    browserRef!.current!
  );
}

export default SwapTrack;
