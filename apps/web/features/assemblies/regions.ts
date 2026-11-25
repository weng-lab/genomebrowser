/**
 * Pure, React-free assembly bounds and region normalization for server routes
 * (such as MCP `set_region`) and shared state commands.
 *
 * `@weng-lab/genomebrowser` currently bundles React client components into its
 * single entry point, so Next.js App Router Route Handlers cannot import `hg38`
 * or `normalizeRegion` from it directly. Parity with core's `hg38.chromosomes`
 * and `normalizeRegion` is verified in `test/liveSessionSync.test.ts`.
 */
export const assemblyChromosomes: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  hg38: {
    chr1: 248_956_422,
    chr2: 242_193_529,
    chr3: 198_295_559,
    chr4: 190_214_555,
    chr5: 181_538_259,
    chr6: 170_805_979,
    chr7: 159_345_973,
    chr8: 145_138_636,
    chr9: 138_394_717,
    chr10: 133_797_422,
    chr11: 135_086_622,
    chr12: 133_275_309,
    chr13: 114_364_328,
    chr14: 107_043_718,
    chr15: 101_991_189,
    chr16: 90_338_345,
    chr17: 83_257_441,
    chr18: 80_373_285,
    chr19: 58_617_616,
    chr20: 64_444_167,
    chr21: 46_709_983,
    chr22: 50_818_468,
    chrX: 156_040_895,
    chrY: 57_227_415,
    chrM: 16_569,
  },
};

export type NormalizedRegionResult =
  | { ok: true; region: { chromosome: string; start: number; end: number }; clamped: boolean }
  | { ok: false; code: string; error: string };

/** Intersects a zero-based, half-open region with its assembly chromosome bounds. */
export function normalizeAssemblyRegion(
  assemblyId: string,
  region: { chromosome: string; start: number; end: number },
): NormalizedRegionResult {
  if (!Number.isSafeInteger(region.start)) {
    return {
      ok: false,
      code: "INVALID_COORDINATE",
      error: "Region start must be a finite safe integer.",
    };
  }
  if (!Number.isSafeInteger(region.end)) {
    return {
      ok: false,
      code: "INVALID_COORDINATE",
      error: "Region end must be a finite safe integer.",
    };
  }
  if (region.start > region.end) {
    return {
      ok: false,
      code: "REVERSED_REGION",
      error: `Region start (${region.start}) must be less than end (${region.end}).`,
    };
  }
  if (region.start === region.end) {
    return {
      ok: false,
      code: "ZERO_WIDTH_REGION",
      error: "Region start and end must define a non-zero width.",
    };
  }

  const chromosomes = assemblyChromosomes[assemblyId];
  if (!chromosomes) {
    return {
      ok: false,
      code: "UNSUPPORTED_ASSEMBLY",
      error: `Unsupported assembly "${assemblyId}".`,
    };
  }
  if (!Object.hasOwn(chromosomes, region.chromosome)) {
    return {
      ok: false,
      code: "UNKNOWN_CHROMOSOME",
      error: `Chromosome "${region.chromosome}" is not present in assembly "${assemblyId}".`,
    };
  }
  const length = chromosomes[region.chromosome];
  if (region.end <= 0 || region.start >= length) {
    return {
      ok: false,
      code: "OUTSIDE_CHROMOSOME",
      error: `Region does not overlap chromosome "${region.chromosome}" bounds [0, ${length}).`,
    };
  }
  const start = Math.max(0, region.start);
  const end = Math.min(length, region.end);
  return {
    ok: true,
    region: { chromosome: region.chromosome, start, end },
    clamped: start !== region.start || end !== region.end,
  };
}
