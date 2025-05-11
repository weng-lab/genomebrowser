import { useEffect } from "react";

import { useRef } from "react";
import { useBrowserStore } from "../../store/browserStore";
import { useTrackStore } from "../../store/trackStore";
import { useDataStore } from "../../store/dataStore";

export default function SvgWrapper({ children }: { children: React.ReactNode }) {
  const setSvgRef = useBrowserStore((state) => state.setSvgRef);
  const totalHeight = useTrackStore((state) => state.getTotalHeight());
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  const fetching = useDataStore((state) => state.fetching);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setSvgRef(svgRef);
  }, [svgRef]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${browserWidth} ${totalHeight}`}
      width="100%"
      height="100%"
      style={{
        border: "1px solid #ccc",
      }}
    >
      {children}
      {fetching && (
        <rect
          width={browserWidth}
          height={totalHeight}
          fill={"#000000"}
          fillOpacity={0.05}
          style={{ pointerEvents: "all" }}
        />
      )}
    </svg>
  );
}
