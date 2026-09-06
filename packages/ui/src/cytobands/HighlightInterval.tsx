import type { renderedHighlight } from "./highlightLayer";

export function HighlightInterval({
  rendered,
  height,
  opacity,
}: {
  rendered: renderedHighlight;
  height: number;
  opacity: number;
}) {
  const { highlight } = rendered;
  const outlined = highlight.type === "outlined";

  return (
    <rect
      data-testid="highlight-visual"
      fill={outlined ? "none" : highlight.color}
      fillOpacity={opacity}
      stroke={outlined ? highlight.color : undefined}
      strokeOpacity={opacity}
      strokeWidth={outlined ? 2 : undefined}
      vectorEffect="non-scaling-stroke"
      pointerEvents="all"
      height={outlined ? Math.max(0, height - 2) : height}
      width={rendered.width}
      x={rendered.x}
      y={outlined ? 1 : 0}
    />
  );
}
