import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { useEffect, useRef, useState } from "react";
import { useBrowserStore } from "./browserStore";
import useBrowserScale from "./useBrowserScale";

export default function DragTrack({ children }: { children: React.ReactNode }) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<SVGGElement>(null);

  const delta = useBrowserStore((state) => state.delta);
  const setDelta = useBrowserStore((state) => state.setDelta);

  const scale = useBrowserScale();

  // when delta changes, update the position of the track if not dragging
  useEffect(() => {
    if (dragging) return;
    setPosition({ x: delta, y: 0 });
  }, [delta, dragging]);

  const handleDrag = (e: DraggableEvent, d: DraggableData) => {
    e.preventDefault();
    setDragging(true);
    setDelta(delta + d.deltaX);
  };

  const setDomain = useBrowserStore((state) => state.setDomain);
  const handleStop = () => {
    if (Math.abs(delta) < 10) return;
    setPosition({ x: delta, y: 0 });
    setDomain(Math.random().toString(36).substring(7));
    setDragging(false);
  };

  return (
    <Draggable
      nodeRef={nodeRef as unknown as React.RefObject<HTMLElement>}
      scale={scale}
      position={position}
      axis="x"
      onDrag={(e, d) => handleDrag(e, d)}
      onStop={handleStop}
    >
      <g ref={nodeRef} height="100%" style={{ cursor: dragging ? "grabbing" : "grab" }}>
        {children}
      </g>
    </Draggable>
  );
}
