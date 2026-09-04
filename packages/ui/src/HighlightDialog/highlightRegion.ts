import {
  normalizeRegion,
  parseRegion,
  type AssemblyDefinition,
  type GenomicRegion,
  type Highlight,
} from "@weng-lab/genomebrowser";

type ParseHighlightRegionResult =
  | { ok: true; region: GenomicRegion }
  | { ok: false; error: string };

export function parseHighlightRegion(
  input: string,
  assembly: AssemblyDefinition,
): ParseHighlightRegionResult {
  let parsedRegion: GenomicRegion;
  try {
    parsedRegion = parseRegion(input);
  } catch {
    return { ok: false, error: 'Enter a region like "chr12:53,372,922-53,423,700".' };
  }

  const result = normalizeRegion(parsedRegion, assembly);
  if (!result.ok) return result;
  if (result.clamped) {
    return { ok: false, error: "Region must fit within the chromosome bounds." };
  }
  return { ok: true, region: result.region };
}

export function resolveHighlightRegion(
  highlight: Highlight,
  currentChromosome: string,
): GenomicRegion {
  return {
    chromosome: highlight.region.chromosome ?? currentChromosome,
    start: highlight.region.start,
    end: highlight.region.end,
  };
}

export function formatRegion(region: GenomicRegion) {
  return `${region.chromosome}:${region.start.toLocaleString("en-US")}-${region.end.toLocaleString("en-US")}`;
}
