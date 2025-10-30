import { useEffect, useMemo, useState } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { useBrowserStore, useDataStore, useTheme } from "../../../store/BrowserContext";
import { Domain } from "../../../utils/types";

export const RULER_HEIGHT = 80;

export default function Ruler() {
  const getTrackDimensions = useBrowserStore((state) => state.getTrackDimensions);
  const { sideWidth, totalWidth } = getTrackDimensions();

  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const getDomain = useBrowserStore((state) => state.getDomain);
  const [domain, setDomain] = useState<Domain>(getExpandedDomain());
  const isFetching = useDataStore((state) => state.isFetching);
  const { x } = useXTransform(totalWidth);

  useEffect(() => {
    if (isFetching) return;
    setDomain(getExpandedDomain());
  }, [isFetching, getExpandedDomain]);

  const text = useTheme((state) => state.text);

  const renderedContent = useMemo(() => {
    const len = domain.end - domain.start;
    const nticks = 20;
    const step = Math.pow(10.0, Math.floor(Math.log10(Math.ceil(len / nticks)))) * 6;
    const viewDomain = getDomain();
    const gscale = ((Math.ceil(viewDomain.end / step) - Math.ceil(viewDomain.start / step)) * step) / 2;
    const gdomain = { start: viewDomain.start + gscale / 2, end: viewDomain.end - gscale / 2 };

    /* create the ticks and labels */
    const gelems = [];
    for (let i = Math.ceil(domain.start / step); i < Math.ceil(domain.end / step); ++i) {
      gelems.push(
        <g key={"ruler_" + i}>
          <line
            x1={x(i * step)}
            x2={x(i * step)}
            y1={RULER_HEIGHT * 0.6}
            y2={RULER_HEIGHT * 0.9}
            stroke={text}
            strokeWidth={0.5}
          />
          {i >= Math.ceil(domain.start / step) && (
            <text
              style={{
                pointerEvents: "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                userSelect: "none",
              }}
              fill={text}
              textAnchor="end"
              fontSize={RULER_HEIGHT / 6 + "px"}
              x={x(i * step) - 5}
              y={RULER_HEIGHT * 0.85}
            >
              {i * step}
            </text>
          )}
        </g>
      );
    }

    return (
      <g width={totalWidth} height={RULER_HEIGHT} transform={`translate(-${sideWidth}, 0)`}>
        <line
          x1={x(gdomain.start)}
          x2={x(gdomain.start)}
          y1={RULER_HEIGHT * 0.1}
          y2={RULER_HEIGHT * 0.4}
          stroke={text}
          strokeWidth={0.5}
        />
        <line
          x1={x(gdomain.end)}
          x2={x(gdomain.end)}
          y1={RULER_HEIGHT * 0.1}
          y2={RULER_HEIGHT * 0.4}
          stroke={text}
          strokeWidth={0.5}
        />
        <line
          x1={x(gdomain.start)}
          x2={x(gdomain.end)}
          y1={RULER_HEIGHT * 0.25}
          y2={RULER_HEIGHT * 0.25}
          stroke={text}
          strokeWidth={0.5}
        />
        <text
          style={{
            pointerEvents: "none",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            userSelect: "none",
          }}
          x={x(gdomain.start) - 5}
          y={RULER_HEIGHT * 0.35}
          fontSize={RULER_HEIGHT / 6 + "px"}
          textAnchor="end"
          fill={text}
        >
          {lengthFormat(gdomain.end - gdomain.start)}
        </text>
        {gelems}
      </g>
    );
  }, [domain, getDomain, x, totalWidth, sideWidth, text]);

  return renderedContent;
}

function lengthFormat(length: number): string {
  if (length >= 1e9) return Math.round(length / 1e9) + " Gb";
  if (length >= 1e6) return Math.round(length / 1e6) + " Mb";
  if (length >= 1e3) return Math.round(length / 1e3) + " kb";
  return length + " bp";
}
