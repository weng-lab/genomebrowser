import type { AssemblyDefinition } from "../../genome/assembly";
import type { GenomicRegion } from "../../genome/region";

type NavigationState = { region: GenomicRegion; assembly: AssemblyDefinition };

/**
 * Whether `pan(fraction)` can move the view: the fraction is finite and nonzero
 * and the view does not already touch the chromosome end it moves toward.
 */
export function canPan({ region, assembly }: NavigationState, fraction: number): boolean {
  const chromosomeLength = getValidChromosomeLength(region, assembly);
  if (chromosomeLength === undefined || !Number.isFinite(fraction) || fraction === 0) return false;
  return fraction < 0 ? region.start > 0 : region.end < chromosomeLength;
}

/**
 * Whether `zoom(factor)` can change the view: the factor is finite, positive,
 * and not 1, and the view is not already one base wide (zooming in) or the
 * whole chromosome (zooming out).
 */
export function canZoom({ region, assembly }: NavigationState, factor: number): boolean {
  const chromosomeLength = getValidChromosomeLength(region, assembly);
  if (chromosomeLength === undefined || !Number.isFinite(factor) || factor <= 0 || factor === 1)
    return false;
  const span = region.end - region.start;
  return factor < 1 ? span > 1 : span < chromosomeLength;
}

/** The region `fraction` of a view width away, keeping the width and staying on the chromosome. */
export function getPannedRegion(
  region: GenomicRegion,
  chromosomeLength: number,
  fraction: number,
): GenomicRegion {
  const span = region.end - region.start;
  const direction = fraction < 0 ? -1 : 1;
  const shift = Math.max(1, Math.round(span * Math.abs(fraction))) * direction;
  const start = Math.min(Math.max(region.start + shift, 0), chromosomeLength - span);
  return { chromosome: region.chromosome, start, end: start + span };
}

function getValidChromosomeLength(region: GenomicRegion, assembly: AssemblyDefinition) {
  const chromosomeLength = assembly.chromosomes[region.chromosome];
  const isValid =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(region.start) &&
    Number.isSafeInteger(region.end) &&
    region.start >= 0 &&
    region.start < region.end &&
    region.end <= chromosomeLength;
  return isValid ? chromosomeLength : undefined;
}
