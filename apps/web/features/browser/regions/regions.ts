import {
  createHighlightId,
  type BrowserHighlightMutationResult,
  type BrowserStoreInstance,
  type GenomicRegion,
  type Highlight,
  type MutationFailure,
} from "@weng-lab/genomebrowser";

/**
 * Saved regions are the browser's highlights. A region keeps its highlight's ID for life and
 * shows the highlight's name, or its ID when it has none. Hiding the highlight keeps the
 * region and its style. They save with the session.
 */

/** Colors new regions take in turn. */
const regionColors = ["#1976d2", "#f59e0b", "#2e7d32", "#9c27b0", "#d32f2f", "#00838f"];

/** Saves `region` as a new region named by its coordinates, with the next color in turn. */
export function saveRegion(browserStore: BrowserStoreInstance, region: GenomicRegion) {
  const { highlights, addHighlight } = browserStore.getState();
  addHighlight({
    id: crypto.randomUUID(),
    name: createHighlightId(region, highlights),
    region,
    color: regionColors[highlights.length % regionColors.length],
    type: "filled",
  });
}

/** The name a region shows. */
export const regionName = (highlight: Highlight) => highlight.name ?? highlight.id;

/**
 * Changes the regions with IDs in `ids` in one validated update, keeping their order. IDs
 * without a region are skipped.
 */
function updateRegions(
  browserStore: BrowserStoreInstance,
  ids: readonly string[],
  change: (highlight: Highlight) => Highlight,
): BrowserHighlightMutationResult {
  const { highlights, updateHighlights } = browserStore.getState();
  const changed = [...new Set(ids)].flatMap((id) => {
    const highlight = highlights.find((existing) => existing.id === id);
    return highlight ? [change(highlight)] : [];
  });
  return updateHighlights(changed);
}

/** Hides or shows the regions' highlights, keeping their style. */
export function setRegionsHidden(
  browserStore: BrowserStoreInstance,
  ids: readonly string[],
  hidden: boolean,
) {
  return updateRegions(browserStore, ids, ({ hidden: _hidden, ...shown }) =>
    hidden ? { ...shown, hidden: true } : shown,
  );
}

export type SetRegionsColorResult =
  | BrowserHighlightMutationResult
  | MutationFailure<"INVALID_COLOR">;

/** Colors the regions' highlights, keeping everything else about them. */
export function setRegionsColor(
  browserStore: BrowserStoreInstance,
  ids: readonly string[],
  color: string,
): SetRegionsColorResult {
  if (!/^#[0-9a-f]{6}$/i.test(color))
    return {
      ok: false,
      code: "INVALID_COLOR",
      error: `Expected a hex color like #1a73e8: ${color}`,
    };
  return updateRegions(browserStore, ids, (highlight) => ({ ...highlight, color }));
}

/** A highlight without a chromosome is drawn on whichever chromosome is shown. */
export function regionOf(highlight: Highlight, shownChromosome: string): GenomicRegion {
  const { chromosome = shownChromosome, start, end } = highlight.region;
  return { chromosome, start, end };
}

export const sameRegion = (a: GenomicRegion, b: GenomicRegion) =>
  a.chromosome === b.chromosome && a.start === b.start && a.end === b.end;
