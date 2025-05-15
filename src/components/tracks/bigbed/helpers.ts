import { Domain } from "../../../utils/types";
import { Rect } from "./types";

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

export function testRender(data: Rect[], totalWidth: number, domain: Domain) {
  const visibleWidth = domain.end - domain.start;
  const sidePiece = Math.floor(visibleWidth * (1.5 - 1) / 2)
  const expandedDomain: Domain = {
    chromosome: domain.chromosome,
    start: domain.start - sidePiece,
    end: domain.end + sidePiece,
  };
  const results: Rect[] = [];
  const domainWidth = expandedDomain.end - expandedDomain.start;
  data.forEach((current) => {
    console.log(current, domain)
    const start = ((current.start - domain.start) / domainWidth) * totalWidth;
    const end = ((current.end - domain.start) / domainWidth) * totalWidth;
    results.push({
      start,
      end,
      color: current.color,
      name: current.name,
      score: current.score,
    });
  });
  return results;
}
