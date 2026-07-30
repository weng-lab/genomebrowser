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
  const minIconSize = 18;
  const maxIconSize = 40;
  const minFontSize = 8;
  const maxFontSize = 12;
  const gap = 2;
  const showIcon = height >= minIconSize + gap + minFontSize;
  const fontSize = showIcon
    ? Math.min(maxFontSize, height - minIconSize - gap)
    : Math.min(maxFontSize, height);
  const size = showIcon
    ? Math.min(maxIconSize, Math.max(minIconSize, height / 3), height - gap - fontSize)
    : 0;
  return (
    <g transform={`translate(${x + (width - size) / 2},${y})`}>
      {showIcon && <ErrorIcon outline="#000000" inside="#ffffff" width={size} height={size} />}
      <text
        fill="#000000"
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={`${fontSize}px`}
        x={size / 2}
        y={showIcon ? size + gap : 0}
      >
        {message}
      </text>
    </g>
  );
}
