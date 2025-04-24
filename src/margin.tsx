export default function Margin({ height, transform, color }: { height: number; transform: string; color: string }) {
  const width = 150;
  const fontSize = 10;
  return (
    <g transform={transform}>
      <rect className="swap-handle" x={0} y={0} width={width} height={height} fill={"white"} style={{ cursor: "default" }} />
      <rect
        x={0}
        y={0}
        width={width / 15}
        height={height}
        stroke="#000000"
        strokeWidth={0.5}
        fill={color}
        style={{ cursor: "default" }}
      />
      <text
        fontSize={`${fontSize}px`}
        y={height / 2}
        x={width / 10}
        alignmentBaseline="middle"
        style={{
          pointerEvents: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
          userSelect: "none",
        }}
      >
        test label
      </text>
      <MarginTick position={height} width={width} fontSize={8}>
        0
      </MarginTick>
      <MarginTick position={height / 4} width={width} fontSize={8}>
        100
      </MarginTick>
      <line stroke="#ccc" x1={width} x2={width} y1={0} y2={height} />
    </g>
  );
}

function MarginTick({
  position,
  width,
  children,
  fontSize,
}: {
  position: number;
  width: number;
  fontSize: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <text
        textAnchor="end"
        alignmentBaseline="middle"
        y={position - 3}
        x={width * 0.94}
        fontSize={`${fontSize}px`}
        style={{
          pointerEvents: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
          userSelect: "none",
        }}
      >
        {children}
      </text>
      <line x1={width * 0.96} x2={width} y1={position} y2={position} stroke="#aaa" />
    </>
  );
}
