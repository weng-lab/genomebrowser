import { TrackLabel } from "@weng-lab/genomebrowser";

type ValueTick = { value: number; y: number; prefix?: string };

/** Renderer-owned scale labels, anchored to the visible plot. */
export function ValueLabels({
  height,
  ticks,
  align = "left",
}: {
  height: number;
  ticks: readonly ValueTick[];
  align?: "left" | "right";
}) {
  if (height < 14) return null;
  const placed: number[] = [];
  return (
    <g pointerEvents="none">
      {ticks.map(({ value, y, prefix = "" }) => {
        if (!Number.isFinite(value) || !Number.isFinite(y)) return null;
        const top = Math.max(0, Math.min(height - 14, y - 7));
        if (placed.some((other) => Math.abs(other - top) < 16)) return null;
        placed.push(top);
        const formatted = String(Number(value.toPrecision(4)));
        const label = `${prefix}${formatted}`;
        return (
          <TrackLabel key={`${prefix}${value}:${y}`} anchor={align} y={y}>
            {label}
          </TrackLabel>
        );
      })}
    </g>
  );
}
