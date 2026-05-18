import { useEffect, useRef } from "react";

export function SvgShell({ width, height, setSvg, children }: { width: number; height: number; setSvg: (svg: SVGSVGElement | null) => void; children: React.ReactNode }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setSvg(svgRef.current);
    return () => setSvg(null);
  }, [setSvg]);

  return (
    <svg id="browserSVG" ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ border: "1px solid #ccc", background: "#ffffff" }}>
      {children}
    </svg>
  );
}
