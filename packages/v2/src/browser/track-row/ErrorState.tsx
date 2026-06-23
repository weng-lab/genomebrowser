import { ErrorIcon } from "./icons";

export function ErrorState({
  x,
  y,
  width,
  height,
  message,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  message: string;
}) {
  const size = Math.max(18, Math.min(height / 3, 40));
  return (
    <g transform={`translate(${x + (width - size) / 2},${y + (height - size) / 2})`}>
      <ErrorIcon outline="#000000" inside="#ffffff" width={size} height={size} />
      <text fill="#000000" textAnchor="middle" fontSize="12px" x={size / 2} y={size + 14}>
        {message}
      </text>
    </g>
  );
}
