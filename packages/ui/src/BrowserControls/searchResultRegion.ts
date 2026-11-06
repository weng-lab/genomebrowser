import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { Result } from "@weng-lab/ui-components";

/**
 * The zero-based, half-open region of a `GenomeSearch` result, or `undefined`
 * when the result has none. Typed coordinates come back one-based and inclusive,
 * as people write them; other results already use browser coordinates.
 */
export function getSearchResultRegion(result: Result): GenomicRegion | undefined {
  if (!result.domain) return undefined;
  const { chromosome, start, end } = result.domain;
  return result.type === "Coordinate"
    ? { chromosome, start: start - 1, end }
    : { chromosome, start, end };
}
