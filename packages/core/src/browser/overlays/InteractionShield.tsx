import type { SyntheticEvent } from "react";
import { useIsInteractionBlocked } from "../state/browserContextState";

function handleBlockedEvent(event: SyntheticEvent<SVGGElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function InteractionShield({ width, height }: { width: number; height: number }) {
  const isInteractionBlocked = useIsInteractionBlocked();
  if (!isInteractionBlocked) return null;

  return (
    <g
      role="status"
      aria-live="polite"
      aria-label="Genome browser is updating track data"
      onClick={handleBlockedEvent}
      onContextMenu={handleBlockedEvent}
      onMouseDown={handleBlockedEvent}
      onPointerDown={handleBlockedEvent}
      style={{ cursor: "wait" }}
    >
      <rect x={0} y={0} width={width} height={height} fill="rgba(255,255,255,0.3)" />
    </g>
  );
}
