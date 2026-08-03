import type { AssemblyDefinition } from "./assembly";

export type GenomicRegion = {
  chromosome: string;
  start: number;
  end: number;
};

export type RegionErrorCode =
  | "INVALID_REGION"
  | "UNKNOWN_CHROMOSOME"
  | "INVALID_COORDINATE"
  | "REVERSED_REGION"
  | "ZERO_WIDTH_REGION"
  | "OUTSIDE_CHROMOSOME";

export type RegionResult =
  | { ok: true; region: GenomicRegion; clamped: boolean }
  | { ok: false; code: RegionErrorCode; error: string };

const coordinatePattern = String.raw`[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)`;
const coordinateRegex = new RegExp(`^${coordinatePattern}$`);
const locusRegex = new RegExp(
  `^(?<chromosome>[^\\s:]+)\\s*:\\s*(?<start>${coordinatePattern})\\s*-\\s*(?<end>${coordinatePattern})$`,
);

/** Parses an assembly-independent, zero-based, half-open genomic region string. */
export function parseRegion(input: string): GenomicRegion {
  if (typeof input !== "string") {
    throw new Error("Invalid region string: expected a string.");
  }

  const trimmed = input.trim();
  const locusMatch = locusRegex.exec(trimmed);
  if (locusMatch?.groups) {
    return regionFromFields(
      locusMatch.groups.chromosome,
      locusMatch.groups.start,
      locusMatch.groups.end,
    );
  }

  const fields = trimmed.split(/\s+/);
  if (
    fields.length === 3 &&
    fields[0].length > 0 &&
    !fields[0].includes(":") &&
    coordinateRegex.test(fields[1]) &&
    coordinateRegex.test(fields[2])
  ) {
    return regionFromFields(fields[0], fields[1], fields[2]);
  }

  throw new Error(
    `Invalid region string: expected "chromosome:start-end" or exactly three whitespace-delimited fields; received "${input}".`,
  );
}

/** Intersects a region with its exact, case-sensitive assembly chromosome bounds. */
export function normalizeRegion(region: GenomicRegion, assembly: AssemblyDefinition): RegionResult {
  if (typeof region !== "object" || region === null || Array.isArray(region)) {
    return regionError(
      "INVALID_REGION",
      "Region must be an object with chromosome, start, and end.",
    );
  }
  if (typeof region.chromosome !== "string" || region.chromosome.length === 0) {
    return regionError("INVALID_REGION", "Region chromosome must be a non-empty string.");
  }

  if (!Number.isSafeInteger(region.start)) {
    return regionError("INVALID_COORDINATE", "Region start must be a finite safe integer.");
  }
  if (!Number.isSafeInteger(region.end)) {
    return regionError("INVALID_COORDINATE", "Region end must be a finite safe integer.");
  }
  if (region.start > region.end) {
    return regionError(
      "REVERSED_REGION",
      `Region start (${region.start}) must be less than end (${region.end}).`,
    );
  }
  if (region.start === region.end) {
    return regionError("ZERO_WIDTH_REGION", "Region start and end must define a non-zero width.");
  }

  if (!Object.hasOwn(assembly.chromosomes, region.chromosome)) {
    return regionError(
      "UNKNOWN_CHROMOSOME",
      `Chromosome "${region.chromosome}" is not present in assembly "${assembly.id}".`,
    );
  }

  const chromosomeLength = assembly.chromosomes[region.chromosome];
  if (region.end <= 0 || region.start >= chromosomeLength) {
    return regionError(
      "OUTSIDE_CHROMOSOME",
      `Region does not overlap chromosome "${region.chromosome}" bounds [0, ${chromosomeLength}).`,
    );
  }

  const start = Math.max(0, region.start);
  const end = Math.min(chromosomeLength, region.end);
  return {
    ok: true,
    region: { chromosome: region.chromosome, start, end },
    clamped: start !== region.start || end !== region.end,
  };
}

function regionFromFields(chromosome: string, start: string, end: string): GenomicRegion {
  return {
    chromosome,
    start: Number(start.replaceAll(",", "")),
    end: Number(end.replaceAll(",", "")),
  };
}

function regionError(code: RegionErrorCode, error: string): RegionResult {
  return { ok: false, code, error };
}
