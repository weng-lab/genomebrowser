import { useEffect } from "react";

import { useRef } from "react";
import { useBrowserStore } from "../../store/browserStore";
import { useTrackStore } from "../../store/trackStore";

export default function SvgWrapper({ children }: { children: React.ReactNode }) {
  const setSvgRef = useBrowserStore((state) => state.setSvgRef);
  const totalHeight = useTrackStore((state) => state.getTotalHeight());
  const browserWidth = useBrowserStore((state) => state.browserWidth);
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
    </svg>
  );
}
