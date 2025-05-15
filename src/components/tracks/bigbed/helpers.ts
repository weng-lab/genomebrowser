import { groupFeatures } from "../../../utils/coordinates";
import { Rect, SquishRect } from "./types";

/**
 * Renders dense BigBed data to SVG rectangles; overlapping regions are merged into single rectangles.
 * @param data input data vector.
 * @param x a transform function for mapping data coordinates to SVG coordinates.
 */
export function renderDenseBigBedData(data: Rect[], x: (value: number) => number): Rect[] {
  const results: Rect[] = [];
  data.forEach((current, i) => {
    if (i === 0 || current.start > data[i - 1].end || current.color != data[i - 1].color)
      results.push({
        start: x(current.start) < 0 ? 0 : x(current.start),
        end: x(current.end) < 0 ? 0 : x(current.end),
        color: current.color,
        name: current.name,
        score: current.score,
      });
    else results[results.length - 1].end = x(current.end);
    return results;
  });
  return results;
}

export function renderSquishBigBedData(data: Rect[], x: (value: number) => number): SquishRect[][] {
  return groupFeatures(
    data
      .sort((a, b) => a.start - b.start)
      .map((x) => ({
        coordinates: { start: x.start, end: x.end },
        color: x.color,
        name: "",
        score: x.score,
        rectname: x.name,
      })),
    x,
    0
  ).map((group) =>
    group.map((feature) => ({
      start: x(feature.coordinates.start) < 0 ? 0 : x(feature.coordinates.start),
      end: x(feature.coordinates.end),
      color: feature.color,
      rectname: feature.rectname,
      name: feature.rectname,
      score: feature.score,
    }))
  );
}
