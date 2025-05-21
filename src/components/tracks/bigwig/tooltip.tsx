export function Tooltip({ value, background, text }: { value: number | undefined; background: string; text: string }) {
  return (
    <g>
      <rect
        y={2}
        width={value ? value.toFixed(2).length * 6 + 1 : 0}
        height={16}
        fill={background}
        stroke={text}
        strokeWidth={0.5}
        rx={2}
      />
      <text
        x={2}
        y={15}
        fill={text}
        fontSize={12}
        style={{
          visibility: value !== undefined ? "visible" : "hidden",
          userSelect: "none",
        }}
      >
        {value?.toFixed(2)}
      </text>
    </g>
  );
}
