const BASE_COLORS: Record<string, string> = {
  A: "#228b22",
  C: "blue",
  G: "orange",
  T: "red",
  N: "#64748b",
};

export function SequenceBase({
  base,
  x,
  y,
  width,
  height,
}: {
  base: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const color = BASE_COLORS[base.toUpperCase()] ?? BASE_COLORS.N;
  return (
    <g>
      <rect
        x={x + 0.5}
        y={y}
        width={Math.max(0, width - 1)}
        height={height}
        fill={color}
        fillOpacity={0.1}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontFamily="monospace"
        fontSize={Math.max(1, Math.min(16, (width - 1) / 0.6, height - 2))}
        fontWeight={600}
      >
        {base}
      </text>
    </g>
  );
}
