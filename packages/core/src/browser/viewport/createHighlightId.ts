import { formatDisplayRegion, type GenomicRegion } from "../../genome/region";
import type { Highlight } from "../state/browserStore";

/**
 * Names a highlight by its displayed coordinates, such as "chr1:126-175", adding " (2)",
 * " (3)", and so on when `highlights` already uses that as an ID or name. The result is
 * both a new ID and a name no other highlight shows.
 */
export function createHighlightId(region: GenomicRegion, highlights: readonly Highlight[]): string {
  const name = formatDisplayRegion(region);
  const taken = new Set(highlights.flatMap((highlight) => [highlight.id, highlight.name]));
  let id = name;
  let suffix = 2;
  while (taken.has(id)) id = `${name} (${suffix++})`;
  return id;
}
