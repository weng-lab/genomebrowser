import { useEffect, useRef } from "react";
import { useBrowserStore, useTrackStore } from "../../store/BrowserContext";
import { RULER_HEIGHT } from "../tracks/ruler/ruler";

export default function SvgWrapper({ children }: { children: React.ReactNode }) {
  const setSvgRef = useBrowserStore((state) => state.setSvgRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const totalHeight = useTrackStore((state) => state.getTotalHeight());
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  // const fetching = useDataStore((state) => state.fetching);

  useEffect(() => {
    setSvgRef(svgRef);
  }, [setSvgRef]);

  return (
    <svg
      id="browserSVG"
      ref={svgRef}
      viewBox={`0 0 ${browserWidth} ${totalHeight + RULER_HEIGHT}`}
      width="100%"
      height="auto"
      style={{
        border: "1px solid #ccc",
      }}
    >
      {children}
      {/* {fetching && (
        <rect
          width={browserWidth}
          height={totalHeight + RULER_HEIGHT}
          fill={"#ffffff"}
          fillOpacity={0.35}
          style={{ pointerEvents: "all" }}
        />
      )} */}
    </svg>
  );
}
