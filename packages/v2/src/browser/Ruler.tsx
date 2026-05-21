import { useMemo } from "react";
import { createXScale } from "../utils/scale";
import { formatLength, type BrowserRegion } from "../utils/region";

export const RULER_HEIGHT = 80;

export function Ruler({ region, width }: { region: BrowserRegion; width: number }) {
  const content = useMemo(() => {
    const len = region.end - region.start;
    const tickTarget = 20;
    const step = Math.pow(10, Math.floor(Math.log10(Math.ceil(len / tickTarget)))) * 6;
    const x = createXScale(region, width);
    const scaleSize = ((Math.ceil(region.end / step) - Math.ceil(region.start / step)) * step) / 2;
    const scaleDomain = { start: region.start + scaleSize / 2, end: region.end - scaleSize / 2 };
    const ticks = [];

    for (let i = Math.ceil(region.start / step); i < Math.ceil(region.end / step); i += 1) {
      const value = i * step;
      ticks.push(
        <g key={value}>
          <line
            x1={x(value)}
            x2={x(value)}
            y1={RULER_HEIGHT * 0.6}
            y2={RULER_HEIGHT * 0.9}
            stroke="#000000"
            strokeWidth={0.5}
          />
          <text
            fill="#000000"
            textAnchor="end"
            fontSize={`${RULER_HEIGHT / 6}px`}
            x={x(value) - 5}
            y={RULER_HEIGHT * 0.85}
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {value.toLocaleString()}
          </text>
        </g>,
      );
    }

    return { x, scaleDomain, ticks };
  }, [region, width]);

  return (
    <g width={width} height={RULER_HEIGHT}>
      <line
        x1={content.x(content.scaleDomain.start)}
        x2={content.x(content.scaleDomain.start)}
        y1={RULER_HEIGHT * 0.1}
        y2={RULER_HEIGHT * 0.4}
        stroke="#000000"
        strokeWidth={0.5}
      />
      <line
        x1={content.x(content.scaleDomain.end)}
        x2={content.x(content.scaleDomain.end)}
        y1={RULER_HEIGHT * 0.1}
        y2={RULER_HEIGHT * 0.4}
        stroke="#000000"
        strokeWidth={0.5}
      />
      <line
        x1={content.x(content.scaleDomain.start)}
        x2={content.x(content.scaleDomain.end)}
        y1={RULER_HEIGHT * 0.25}
        y2={RULER_HEIGHT * 0.25}
        stroke="#000000"
        strokeWidth={0.5}
      />
      <text
        x={content.x(content.scaleDomain.start) - 5}
        y={RULER_HEIGHT * 0.35}
        fontSize={`${RULER_HEIGHT / 6}px`}
        textAnchor="end"
        fill="#000000"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {formatLength(content.scaleDomain.end - content.scaleDomain.start)}
      </text>
      {content.ticks}
    </g>
  );
}
