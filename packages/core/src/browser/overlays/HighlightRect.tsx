import type { SVGProps } from "react";
import type { HighlightType } from "./resolveHighlight";

export type HighlightRectProps = Omit<
  SVGProps<SVGRectElement>,
  "x" | "y" | "width" | "height" | "color" | "opacity" | "type"
> & {
  x: number;
  width: number;
  /** Height of the highlighted band. An outline is inset so its stroke stays inside it. */
  height: number;
  color: string;
  opacity: number;
  type: HighlightType;
};

/** Draws one highlight band the way the browser does: a translucent fill or a 2px outline. */
export function HighlightRect({
  x,
  width,
  height,
  color,
  opacity,
  type,
  ...rectProps
}: HighlightRectProps) {
  const outlined = type === "outlined";
  return (
    <rect
      {...rectProps}
      x={x}
      y={outlined ? 1 : 0}
      width={width}
      height={outlined ? Math.max(0, height - 2) : height}
      fill={outlined ? "none" : color}
      fillOpacity={opacity}
      stroke={outlined ? color : undefined}
      strokeOpacity={opacity}
      strokeWidth={outlined ? 2 : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );
}
