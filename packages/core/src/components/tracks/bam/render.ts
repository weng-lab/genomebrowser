import { groupFeatures } from "../../../utils/coordinates";
import { BamRect } from "./types";

export function renderDenseBamData(data: BamRect[], x: (value: number) => number): BamRect[] {
  const results: BamRect[] = [];
  const sorted = [...data].sort((a, b) => a.start - b.start);

  sorted.forEach((current, i) => {
    if (i === 0 || current.start > sorted[i - 1].end || current.color !== sorted[i - 1].color) {
      results.push({
        start: Math.max(0, x(current.start)),
        end: x(current.end),
        color: current.color,
        cigarOps: current.cigarOps,
        strand: current.strand,
        seq: current.seq,
        name: current.name,
      });
    } else {
      results[results.length - 1].end = x(current.end);
    }
  });

  return results;
}

interface BamFeature {
  coordinates: { start: number; end: number };
  color?: string;
  name: string;
  cigarOps: { opStart: number; opEnd: number; op: string }[];
  strand?: boolean;
  seq?: string;
}

export function renderSquishBamData(data: BamRect[], x: (value: number) => number): BamRect[][] {
  const sorted = [...data].sort((a, b) => a.start - b.start);

  const features: BamFeature[] = sorted.map((rect) => ({
    coordinates: { start: rect.start, end: rect.end },
    color: rect.color,
    name: rect.name || "",
    cigarOps: rect.cigarOps,
    strand: rect.strand,
    seq: rect.seq,
  }));

  const grouped = groupFeatures(features, x, 0);

  return grouped.map((group) =>
    group.map((feature) => ({
      start: Math.max(0, x(feature.coordinates.start)),
      end: x(feature.coordinates.end),
      color: feature.color,
      name: feature.name,
      strand: feature.strand,
      seq: feature.seq,
      cigarOps: feature.cigarOps.map((cg) => ({
        opStart: Math.max(0, x(cg.opStart)),
        opEnd: x(cg.opEnd),
        op: cg.op,
      })),
    }))
  );
}
