import { formatDisplayRegion, type GenomicRegion } from "../../genome/region";
import type { Highlight } from "../state/browserStore";

/**
 * Names a highlight by its displayed coordinates, such as "chr1:126-175", adding " (2)",
 * " (3)", and so on when `highlights` already uses that ID.
 */
export function createHighlightId(region: GenomicRegion, highlights: readonly Highlight[]): string {
  const name = formatDisplayRegion(region);
  const ids = new Set(highlights.map((highlight) => highlight.id));
  let id = name;
  let suffix = 2;
  while (ids.has(id)) id = `${name} (${suffix++})`;
  return id;
}
