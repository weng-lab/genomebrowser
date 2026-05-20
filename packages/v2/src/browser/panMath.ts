import type { BrowserRegion } from "../utils/region";

export function expandRegion(region: BrowserRegion, multiplier: number): BrowserRegion {
  const span = region.end - region.start;
  const sideBases = Math.floor((span * (multiplier - 1)) / 2);

  return {
    chromosome: region.chromosome,
    start: region.start - sideBases,
    end: region.end + sideBases,
  };
}

export function getPanCommitRegion(
  region: BrowserRegion,
  width: number,
  deltaPx: number,
): BrowserRegion {
  const span = region.end - region.start;
  const shiftBases = Math.floor((deltaPx / width) * span);

  return {
    chromosome: region.chromosome,
    start: region.start - shiftBases,
    end: region.end - shiftBases,
  };
}
