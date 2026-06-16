import type { SyntheticEvent } from "react";

function handleBlockedEvent(event: SyntheticEvent<SVGGElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function InteractionShield({
  active,
  width,
  height,
}: {
  active: boolean;
  width: number;
  height: number;
}) {
  if (!active) return null;

  return (
    <g
      role="status"
      aria-live="polite"
      aria-label="Genome browser is updating track data"
      tabIndex={0}
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
