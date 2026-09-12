import { TrackOverlay } from "./TrackOverlay";

export type TrackLabelProps = {
  children: string | number;
  inset?: number;
} & (
  | { anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right"; y?: never }
  | { anchor: "left" | "right"; y: number }
);

/** A fixed, non-interactive label in visible plot coordinates. */
export function TrackLabel({ children, anchor, y, inset = 4 }: TrackLabelProps) {
  const text = String(children);
  const labelWidth = text.length * 6.1 + 8;
  return (
    <TrackOverlay>
      {({ width, height }) => {
        if (height < 14 || width < labelWidth + inset * 2) return null;
        const centerY = y ?? (anchor.startsWith("top") ? 0 : height);
        if (!Number.isFinite(centerY)) return null;
        const top = Math.max(0, Math.min(height - 14, centerY - 7));
        const left = anchor.endsWith("right") ? width - inset - labelWidth : inset;
        return (
          <g>
            <rect
              x={left}
              y={top}
              width={labelWidth}
              height={14}
              rx={2}
              fill="white"
              fillOpacity={0.8}
            />
            <text
              x={left + labelWidth / 2}
              y={top + 10}
              textAnchor="middle"
              fontSize={10}
              fill="#111"
              fontFamily="monospace"
            >
              {text}
            </text>
          </g>
        );
      }}
    </TrackOverlay>
  );
}
