import { useEffect, useRef } from "react";

export function SvgShell({
  width,
  height,
  setSvg,
  children,
}: {
  width: number;
  height: number;
  setSvg: (svg: SVGSVGElement | null) => void;
  children: React.ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setSvg(svgRef.current);
    return () => setSvg(null);
  }, [setSvg]);

  return (
    <svg
      id="browserSVG"
      tabIndex={0}
      role="group"
      aria-label="Genome browser. P to pan, Z to select zoom, H to highlight, Escape to cancel. Shift-drag to zoom; Alt-Shift-drag to highlight."
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="auto"
      style={{ border: "1px solid #ccc", background: "#ffffff" }}
    >
      {children}
    </svg>
  );
}
