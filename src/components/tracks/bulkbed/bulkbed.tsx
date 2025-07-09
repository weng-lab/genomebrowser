import DenseBigBed from "../bigbed/dense";
import { BulkBedProps, Rect } from "./types";

export default function BulkBed({
  data,
  id,
  color,
  height,
  dimensions,
  gap = 2,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: BulkBedProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate instance height based on total height and gap
  const totalGaps = gap * (data.length - 1);
  const instanceHeight = (height - totalGaps) / data.length;

  return (
    <>
      {data.map((dataset: Rect[], i) => {
        const yOffset = i * (instanceHeight + gap);
        return (
          <g key={`${id}-${i}`} transform={`translate(0, ${yOffset})`}>
            <DenseBigBed
              data={dataset}
              id={`${id}-${i}`}
              color={color}
              height={instanceHeight}
              dimensions={dimensions}
              verticalPadding={0}
              onClick={() => {}}
              onHover={() => {}}
              onLeave={() => {}}
              tooltip={() => null}
            />
          </g>
        );
      })}
    </>
  );
}
