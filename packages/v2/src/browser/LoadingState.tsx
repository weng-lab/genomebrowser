import { LoadingSpinner } from "./icons";

export function LoadingState({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const size = Math.max(18, Math.min(height / 3, 40));
  return (
    <g transform={`translate(${x + (width - size) / 2},${y + (height - size) / 2})`}>
      <LoadingSpinner width={size} height={size} color="#000000" />
    </g>
  );
}
