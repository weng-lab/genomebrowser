import type { GenomicRegion } from "../../genome/region";
import type { Highlight } from "../state/browserStore";

export function createHighlightId(region: GenomicRegion, highlights: readonly Highlight[]): string {
  const name = `${region.chromosome}:${region.start.toLocaleString("en-US")}-${region.end.toLocaleString("en-US")}`;
  const ids = new Set(highlights.map((highlight) => highlight.id));
  let id = name;
  let suffix = 2;
  while (ids.has(id)) id = `${name} (${suffix++})`;
  return id;
}
