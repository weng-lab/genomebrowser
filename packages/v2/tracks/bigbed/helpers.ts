import type { BigBedRow, RenderedBigBedRect } from "./types";

type Feature<T> = T & { coordinates: { start: number; end: number }; name: string };

export function renderDenseBigBedData(
  rows: BigBedRow[],
  x: (value: number) => number,
): RenderedBigBedRect[] {
  const sorted = [...rows].sort((a, b) => a.start - b.start);
  const rendered: RenderedBigBedRect[] = [];

  for (const row of sorted) {
    const previous = rendered[rendered.length - 1];
    if (!previous || row.start > previous.row.end || row.color !== previous.row.color) {
      rendered.push({
        row,
        start: Math.max(0, x(row.start)),
        end: x(row.end),
        color: row.color,
        name: row.name,
        score: row.score,
      });
    } else {
      previous.end = x(row.end);
      previous.row = { ...previous.row, end: row.end };
    }
  }

  return rendered;
}

export function renderSquishBigBedData(
  rows: BigBedRow[],
  x: (value: number) => number,
): RenderedBigBedRect[][] {
  const features = [...rows]
    .sort((a, b) => a.start - b.start)
    .map((row) => ({
      row,
      coordinates: { start: row.start, end: row.end },
      name: row.name ?? "",
    }));

  return groupFeatures(features, x, 0).map((group) =>
    group.map((feature) => ({
      row: feature.row,
      start: Math.max(0, x(feature.coordinates.start)),
      end: x(feature.coordinates.end),
      color: feature.row.color,
      name: feature.row.name,
      score: feature.row.score,
    })),
  );
}

export function groupFeatures<T extends Feature<unknown>>(
  features: T[],
  x: (value: number) => number,
  fontSize: number,
  margin = 10,
): T[][] {
  return features.reduce<T[][]>((groups, feature) => {
    for (const group of groups) {
      const previous = group[group.length - 1];
      if (
        x(previous.coordinates.end) + margin + fontSize * previous.name.length <=
        x(feature.coordinates.start)
      ) {
        group.push(feature);
        return groups;
      }
    }
    groups.push([feature]);
    return groups;
  }, []);
}
