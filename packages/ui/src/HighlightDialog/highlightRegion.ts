import {
  normalizeRegion,
  parseDisplayRegion,
  type AssemblyDefinition,
  type GenomicRegion,
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
    parsedRegion = parseDisplayRegion(input);
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
