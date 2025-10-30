import { useEffect, useState } from "react";
import { useBrowserStore, useTrackStore, useDataStore } from "../../store/BrowserContext";
import { Domain } from "../../utils/types";
import { RULER_HEIGHT } from "../tracks/ruler/ruler";
import DragTrack from "../tracks/wrapper/dragTrack";
import { Highlight } from "./types";

export default function Highlights() {
  const isFetching = useDataStore((state) => state.isFetching);
  const domain = useBrowserStore((state) => state.domain);
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const [browserDomain, setBrowserDomain] = useState<Domain>(getExpandedDomain());
  const delta = useBrowserStore((state) => state.delta);

  useEffect(() => {
    if (isFetching || delta !== 0) {
      return;
    }
    setBrowserDomain(getExpandedDomain());
  }, [delta, getExpandedDomain, isFetching, domain]);

  // highlights
  const highlights = useBrowserStore((state) => state.highlights);

  // dimensions
  const totalHeight = useTrackStore((state) => state.getTotalHeight()) + RULER_HEIGHT;
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const getTrackDimensions = useBrowserStore((state) => state.getTrackDimensions);
  const { totalWidth, sideWidth, viewWidth } = getTrackDimensions();

  return (
    <g id="highlights" width={viewWidth + marginWidth} height={totalHeight} transform={`translate(${-sideWidth}, 0)`}>
      <defs>
        <clipPath id="highlight-clip">
          <rect width={viewWidth} height={totalHeight} transform={`translate(${viewWidth + marginWidth}, 0)`} />
        </clipPath>
      </defs>
      <g id="highlights-clipped" clipPath="url(#highlight-clip)">
        <DragTrack id="highlights">
          {highlights.map((highlight: Highlight) => {
            let chr = highlight.domain.chromosome;
            if (!chr) {
              chr = browserDomain.chromosome;
            }
            if (chr !== browserDomain.chromosome) {
              return null;
            }
            return (
              <HighlightRect
                key={highlight.id}
                highlight={highlight}
                totalWidth={totalWidth}
                browserDomain={browserDomain}
                totalHeight={totalHeight}
                marginWidth={marginWidth}
              />
            );
          })}
        </DragTrack>
      </g>
    </g>
  );
}

function HighlightRect({
  highlight,
  browserDomain,
  totalHeight,
  totalWidth,
  marginWidth,
}: {
  highlight: Highlight;
  browserDomain: Domain;
  totalHeight: number;
  totalWidth: number;
  marginWidth: number;
}) {
  const domain = highlight.domain;
  const position = domainPosition(domain, browserDomain, totalWidth);

  return (
    <rect
      x={position.start + marginWidth}
      width={position.end - position.start}
      y={0}
      height={totalHeight}
      fill={highlight.color}
      fillOpacity={0.2}
      style={{ pointerEvents: "none" }}
    />
  );
}

function domainPosition(
  domain: { chromosome?: string; start: number; end: number },
  browserDomain: Domain,
  totalWidth: number
) {
  const width = browserDomain.end - browserDomain.start;
  const start = (domain.start - browserDomain.start) / width;
  const end = (domain.end - browserDomain.start) / width;
  return { start: start * totalWidth, end: end * totalWidth };
}
