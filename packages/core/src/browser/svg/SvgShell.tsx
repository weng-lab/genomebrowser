import { useEffect, useRef } from "react";

export function SvgShell({
  width,
  height,
  scale,
  setSvg,
  children,
}: {
  width: number;
  height: number;
  scale: number;
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
      role="group"
      aria-label="Genome browser"
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      style={{ display: "block", background: "#ffffff", outline: "none", maxWidth: "none" }}
    >
      {children}
    </svg>
  );
}
