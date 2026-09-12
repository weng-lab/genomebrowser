import type { YRange } from "../bigwig/types";
import { ValueLabels } from "../shared/ValueLabels";

/** Labels the enabled strands of a scale mirrored around the track midpoint. */
export function MirroredValueLabels({
  height,
  range,
  plus,
  minus,
  align = "left",
  prefix = "",
}: {
  height: number;
  range: YRange;
  plus: boolean;
  minus: boolean;
  align?: "left" | "right";
  prefix?: string;
}) {
  if (!plus && !minus) return null;
  return (
    <ValueLabels
      height={height}
      align={align}
      ticks={[
        ...(plus ? [{ value: range.max, y: 0, prefix }] : []),
        ...(minus ? [{ value: range.max, y: height, prefix }] : []),
        { value: range.min, y: height / 2, prefix },
      ]}
    />
  );
}
