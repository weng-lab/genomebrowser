import { useTheme } from "@mui/material/styles";
import { useLayoutEffect, useRef, useState } from "react";

const paddingX = 10;
const paddingY = 8;
const rowHeight = 17;
const valueX = 84;
const coloredLabelWidth = valueX - 8;

export type TrackTooltipRow = {
  label: string;
  value: string;
  color?: string;
};

export type TrackTooltipProps = {
  title?: string;
  rows: readonly TrackTooltipRow[];
};

/** A compact, theme-aware tooltip surface for content rendered inside the browser SVG. */
export function TrackTooltip({ title, rows }: TrackTooltipProps) {
  const theme = useTheme();
  const contentRef = useRef<SVGGElement>(null);
  const contentHeight = (title ? 20 : 0) + Math.max(rows.length, 1) * rowHeight;
  const [contentWidth, setContentWidth] = useState(160);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    setContentWidth(contentRef.current.getBBox().width);
  }, [rows, title]);

  return (
    <g role="tooltip" style={{ pointerEvents: "none" }}>
      <rect
        x={-paddingX}
        y={-paddingY}
        width={contentWidth + paddingX * 2}
        height={contentHeight + paddingY * 2}
        rx={theme.shape.borderRadius}
        fill={theme.palette.background.paper}
        stroke={theme.palette.divider}
        style={{ filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.18))" }}
      />
      <g ref={contentRef}>
        {title ? (
          <text
            y={1}
            fill={theme.palette.text.primary}
            dominantBaseline="hanging"
            fontFamily={theme.typography.fontFamily}
            fontSize={12}
            fontWeight={theme.typography.fontWeightMedium}
          >
            {title}
          </text>
        ) : null}
        <g transform={`translate(0 ${title ? 20 : 0})`}>
          {rows.map((row, index) => {
            const y = index * rowHeight + rowHeight / 2;
            const labelX = row.color ? 8 : 0;
            return (
              <g key={`${row.label}-${index}`}>
                {row.color ? (
                  <>
                    <rect
                      x={0}
                      y={index * rowHeight + 1}
                      width={coloredLabelWidth}
                      height={rowHeight - 2}
                      rx={2}
                      fill={row.color}
                      fillOpacity={0.12}
                    />
                    <rect
                      x={0}
                      y={index * rowHeight + 1}
                      width={3}
                      height={rowHeight - 2}
                      rx={1.5}
                      fill={row.color}
                    />
                  </>
                ) : null}
                <text
                  x={labelX}
                  y={y}
                  fill={theme.palette.text.secondary}
                  dominantBaseline="middle"
                  fontFamily={theme.typography.fontFamily}
                  fontSize={11}
                >
                  {row.label}
                </text>
                <text
                  x={valueX}
                  y={y}
                  fill={theme.palette.text.primary}
                  dominantBaseline="middle"
                  fontFamily={theme.typography.fontFamily}
                  fontSize={11}
                  fontWeight={theme.typography.fontWeightMedium}
                >
                  {row.value}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </g>
  );
}
