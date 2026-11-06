import { HighlightRect } from "@weng-lab/genomebrowser";
import type { renderedHighlight } from "./highlightLayer";

export function HighlightInterval({
  rendered,
  height,
}: {
  rendered: renderedHighlight;
  height: number;
}) {
  return (
    <HighlightRect
      data-testid="highlight-visual"
      pointerEvents="all"
      x={rendered.x}
      width={rendered.width}
      height={height}
      color={rendered.highlight.color}
      opacity={rendered.opacity}
      type={rendered.type}
    />
  );
}
