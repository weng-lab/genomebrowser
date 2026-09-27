import { TrackOverlay } from "./TrackOverlay";

export type TrackLabelProps = {
  children: string | number;
  inset?: number;
  overflow?: "hide" | "truncate";
} & (
  | { anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right"; y?: never }
  | { anchor: "left" | "right"; y: number }
  | { anchor: "center"; y?: number }
);

/** A fixed, non-interactive label in visible plot coordinates. */
export function TrackLabel({ children, anchor, y, inset = 4, overflow = "hide" }: TrackLabelProps) {
  const text = String(children);
  const characters = Array.from(text);
  return (
    <TrackOverlay>
      {({ width, height }) => {
        const labelHeight = overflow === "truncate" ? Math.min(14, height) : 14;
        const fontSize = (labelHeight / 14) * 10;
        const characterWidth = fontSize * 0.61;
        const capacity = Math.floor((width - inset * 2 - 8) / characterWidth);
        const truncated = characters.length > capacity;
        if (
          height <= 0 ||
          height < labelHeight ||
          capacity < 1 ||
          (truncated && overflow === "hide")
        )
          return null;
        const displayed = truncated ? `${characters.slice(0, capacity - 1).join("")}…` : text;
        const labelWidth = (truncated ? capacity : characters.length) * characterWidth + 8;
        const centerY =
          y ?? (anchor === "center" ? height / 2 : anchor.startsWith("top") ? 0 : height);
        if (!Number.isFinite(centerY)) return null;
        const top = Math.max(0, Math.min(height - labelHeight, centerY - labelHeight / 2));
        const left =
          anchor === "center"
            ? (width - labelWidth) / 2
            : anchor.endsWith("right")
              ? width - inset - labelWidth
              : inset;
        return (
          <g pointerEvents={truncated ? "auto" : undefined}>
            {truncated && <title>{text}</title>}
            <rect
              x={left}
              y={top}
              width={labelWidth}
              height={labelHeight}
              rx={2}
              fill="white"
              fillOpacity={0.8}
            />
            <text
              aria-label={truncated ? text : undefined}
              x={left + labelWidth / 2}
              y={top + labelHeight / 2 + fontSize * 0.3}
              textAnchor="middle"
              fontSize={fontSize}
              fill="#111"
              fontFamily="monospace"
            >
              {displayed}
            </text>
          </g>
        );
      }}
    </TrackOverlay>
  );
}
