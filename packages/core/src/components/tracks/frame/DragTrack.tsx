import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { useEffect, useMemo, useRef, useState } from "react";
import useBrowserScale from "../../../hooks/useBrowserScale";
import { useBrowserStore } from "../../../store/BrowserContext";

export default function DragTrack({ children, id }: { children: React.ReactNode; id: string }) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<SVGGElement>(null);

  const delta = useBrowserStore((state) => state.delta);
  const setDelta = useBrowserStore((state) => state.setDelta);
  const shiftDomain = useBrowserStore((state) => state.shiftDomain);

  const scale = useBrowserScale();

  useEffect(() => {
    if (dragging) return;
    setPosition({ x: delta, y: 0 });
  }, [delta, dragging]);

  const handleDrag = (e: DraggableEvent, d: DraggableData) => {
    e.preventDefault();
    setDragging(true);
    setDelta(delta + d.deltaX);
  };

  const handleStop = () => {
    setDragging(false);
    if (Math.abs(delta) < 10) {
      setDelta(0);
      return;
    }
    setPosition({ x: delta, y: 0 });
    shiftDomain();
  };

  const cursor = useMemo(() => {
    if (dragging) return "grabbing";
    if (delta !== 0) return "default";
    return "grab";
  }, [delta, dragging]);

  const canDrag = useMemo(() => {
    return delta !== 0 ? () => false : () => {};
  }, [delta]);

  return (
    <Draggable
      nodeRef={nodeRef as unknown as React.RefObject<HTMLElement>}
      scale={scale}
      position={position}
      axis="x"
      onStart={canDrag}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <g id={`drag-track-${id}`} ref={nodeRef} height="100%" style={{ cursor }}>
        {children}
      </g>
    </Draggable>
  );
}
