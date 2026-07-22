import type { BrowserRegion } from "@weng-lab/genomebrowser";

const bracketColor = "#1976d2";
const minimumBracketWidth = 8;
const maximumCapWidth = 3;
const coordinateFormatter = new Intl.NumberFormat("en-US");

type currentRegionBracketProps = {
  chromosome: string;
  extentStart: number;
  extentEnd: number;
  width: number;
  height: number;
  currentRegion?: BrowserRegion;
};

export function currentRegionBracket({
  chromosome,
  extentStart,
  extentEnd,
  width,
  height,
  currentRegion,
}: currentRegionBracketProps) {
  const geometry = getBracketGeometry({
    chromosome,
    extentStart,
    extentEnd,
    width,
    height,
    currentRegion,
  });
  if (!geometry || !currentRegion) return null;

  const { left, right, top, bottom, capWidth } = geometry;
  return (
    <g
      aria-label={`Current region ${formatRegion(currentRegion)}`}
      data-testid="current-region-bracket"
      pointerEvents="none"
      role="img"
    >
      <polyline
        data-testid="current-region-left-boundary"
        fill="none"
        points={`${left + capWidth},${top} ${left},${top} ${left},${bottom} ${left + capWidth},${bottom}`}
        stroke={bracketColor}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        data-testid="current-region-right-boundary"
        fill="none"
        points={`${right - capWidth},${top} ${right},${top} ${right},${bottom} ${right - capWidth},${bottom}`}
        stroke={bracketColor}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function getBracketGeometry({
  chromosome,
  extentStart,
  extentEnd,
  width,
  height,
  currentRegion,
}: currentRegionBracketProps) {
  const span = extentEnd - extentStart;
  if (
    !currentRegion ||
    currentRegion.chromosome !== chromosome ||
    !Number.isSafeInteger(currentRegion.start) ||
    !Number.isSafeInteger(currentRegion.end) ||
    currentRegion.start >= currentRegion.end ||
    currentRegion.end <= extentStart ||
    currentRegion.start >= extentEnd ||
    span <= 0 ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }

  const clippedStart = Math.max(currentRegion.start, extentStart);
  const clippedEnd = Math.min(currentRegion.end, extentEnd);
  const trueLeft = ((clippedStart - extentStart) / span) * width;
  const trueRight = ((clippedEnd - extentStart) / span) * width;
  const bracketWidth = Math.min(width, Math.max(minimumBracketWidth, trueRight - trueLeft));
  const center = (trueLeft + trueRight) / 2;
  const left = Math.max(0, Math.min(center - bracketWidth / 2, width - bracketWidth));
  const right = left + bracketWidth;
  const top = 0;
  const bottom = height;

  return {
    left,
    right,
    top,
    bottom,
    capWidth: Math.min(maximumCapWidth, bracketWidth / 2),
  };
}

function formatRegion(region: BrowserRegion) {
  return `${region.chromosome}: ${coordinateFormatter.format(region.start)}–${coordinateFormatter.format(region.end)}`;
}
