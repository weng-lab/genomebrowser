import { m, l } from "../../../utils/svg";
import { ValuedPoint, YRange } from "../bigwig/types";

export function generateSignal(
  data: ValuedPoint[],
  height: number,
  color: string,
  inverted: boolean = false,
  customRange?: YRange
) {
  const validation = validateAndNormalizeData(data, customRange);
  if (!validation) return null;

  const { range, rangeSize } = validation;
  const startY = inverted ? 0 : height;
  let pathString = m(0, startY);

  data.forEach((point) => {
    const normalized = normalizePoint(point, range, rangeSize, height, inverted);
    const returnY = inverted ? 0 : height;

    // Draw to bar height, across 1 pixel, then back to baseline
    pathString += l(normalized.x, normalized.y) + l(normalized.x + 1, normalized.y) + l(normalized.x + 1, returnY);
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
  const validation = validateAndNormalizeData(data, customRange);
  if (!validation) return null;

  const { range, rangeSize } = validation;
  let pathString = "";

  data.forEach((point, index) => {
    const normalized = normalizePoint(point, range, rangeSize, height, inverted);

    // Start with move command for first point, line command for subsequent points
    if (index === 0) {
      pathString += m(normalized.x, normalized.y);
    } else {
      pathString += l(normalized.x, normalized.y);
    }
  });

  return <path d={pathString} stroke={color} fill="none" strokeWidth="1" />;
}

function validateAndNormalizeData(data: ValuedPoint[], customRange?: YRange) {
  if (!data || data.length === 0) return null;

  const range = customRange || { min: getMinValue(data), max: getMaxValue(data) };
  const rangeSize = range.max - range.min;
  if (rangeSize <= 0) return null;

  return { range, rangeSize };
}

function normalizePoint(point: ValuedPoint, range: YRange, rangeSize: number, height: number, inverted: boolean) {
  const clampedValue = Math.max(range.min, Math.min(range.max, point.max));
  const normalizedValue = (clampedValue - range.min) / rangeSize;
  const scaledHeight = normalizedValue * height;

  return {
    x: point.x,
    y: inverted ? scaledHeight : height - scaledHeight,
  };
}

// Helper function to calculate max value for scaling
function getMaxValue(data: ValuedPoint[]): number {
  return Math.max(...data.map((point) => point.max));
}

function getMinValue(data: ValuedPoint[]): number {
  return Math.min(...data.map((point) => point.min));
}
