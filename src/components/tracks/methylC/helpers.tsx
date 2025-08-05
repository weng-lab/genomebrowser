import { m, l } from "../../../utils/svg";
import { ValuedPoint, YRange } from "../bigwig/types";

export function generateSignal(
  data: ValuedPoint[],
  height: number,
  color: string,
  inverted: boolean = false,
  customRange?: YRange
) {
  if (!data || data.length === 0) return null;

  // Determine range for scaling
  const range = customRange || { min: 0, max: getMaxValue(data) };
  const rangeSize = range.max - range.min;
  if (rangeSize <= 0) return null;

  // Generate path string for histogram
  const startY = inverted ? 0 : height;
  let pathString = m(0, startY);

  data.forEach((point) => {
    // Clamp value to custom range
    const clampedValue = Math.max(range.min, Math.min(range.max, point.max));
    const normalizedValue = (clampedValue - range.min) / rangeSize;
    const barHeight = normalizedValue * height;

    const targetY = inverted ? barHeight : height - barHeight;
    const returnY = inverted ? 0 : height;
    const x = point.x;

    // Draw to bar height, across 1 pixel, then back to baseline
    pathString += l(x, targetY) + l(x + 1, targetY) + l(x + 1, returnY);
  });

  return <path d={pathString} fill={color} />;
}

export function generateLineGraph(
  data: ValuedPoint[],
  height: number,
  color: string,
  inverted: boolean = false,
  customRange?: YRange
) {
  if (!data || data.length === 0) return null;

  // Determine range for scaling
  const range = customRange || { min: 0, max: getMaxValue(data) };
  const rangeSize = range.max - range.min;
  if (rangeSize <= 0) return null;

  // Generate path string for line graph
  let pathString = "";

  data.forEach((point, index) => {
    // Clamp value to custom range
    const clampedValue = Math.max(range.min, Math.min(range.max, point.max));
    const normalizedValue = (clampedValue - range.min) / rangeSize;
    const lineHeight = normalizedValue * height;

    const y = inverted ? lineHeight : height - lineHeight;
    const x = point.x;

    // Start with move command for first point, line command for subsequent points
    if (index === 0) {
      pathString += m(x, y);
    } else {
      pathString += l(x, y);
    }
  });

  return <path d={pathString} stroke={color} fill="none" strokeWidth="1" />;
}

// Helper function to calculate max value for scaling
function getMaxValue(data: ValuedPoint[]): number {
  return Math.max(...data.map((point) => point.max));
}
