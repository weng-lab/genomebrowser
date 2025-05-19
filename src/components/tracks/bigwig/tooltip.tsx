import { useBrowserStore } from "../../../store/browserStore";
import { useTheme } from "../../../store/themeStore";

export function Tooltip({
  x,
  value,
  trackHeight,
}: {
  x: number | undefined;
  value: number | undefined;
  trackHeight: number;
}) {
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const { background, text } = useTheme();
  if (!x) return null;

  return (
    <>
      <line stroke={text} x1={x ? x - marginWidth : 0} x2={x ? x - marginWidth : 0} y1={0} y2={trackHeight} />
      {/* Background rectangle */}
      <rect
        x={x - marginWidth + 5}
        y={2}
        width={value ? value.toFixed(2).length * 6 + 1 : 0}
        height={16}
        fill={background}
        stroke={text}
        strokeWidth={0.5}
        rx={2}
      />
      <text
        x={x - marginWidth + 7}
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
    </>
  );
}
