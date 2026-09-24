import { memo } from "react";
import type { GeneLabelLayout } from "./labels";

export const GeneLabel = memo(function GeneLabel({
  label,
  color,
  fontSize,
  rowTop,
  rowHeight,
}: {
  label: GeneLabelLayout | null;
  color: string;
  fontSize: number;
  rowTop: number;
  rowHeight: number;
}) {
  if (!label) return null;
  return (
    <text
      data-gene-label=""
      x={label.x}
      y={rowTop + rowHeight / 2}
      textAnchor={label.anchor}
      dominantBaseline="middle"
      fill={color}
      fontSize={fontSize}
      pointerEvents="none"
      style={{ userSelect: "none" }}
    >
      {label.text}
    </text>
  );
});
