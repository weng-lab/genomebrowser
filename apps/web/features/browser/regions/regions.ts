import {
  createHighlightId,
  type BrowserStoreInstance,
  type GenomicRegion,
  type Highlight,
} from "@weng-lab/genomebrowser";

/**
 * Saved regions are the browser's highlights: a highlight's ID is its region's name, and
 * hiding the highlight keeps the region and its style. They save with the session.
 */

/** Colors new regions take in turn. */
const regionColors = ["#1976d2", "#f59e0b", "#2e7d32", "#9c27b0", "#d32f2f", "#00838f"];

/** Saves `region` as a new region named by its coordinates, with the next color in turn. */
export function saveRegion(browserStore: BrowserStoreInstance, region: GenomicRegion) {
  const { highlights, addHighlight } = browserStore.getState();
  addHighlight({
    id: createHighlightId(region, highlights),
    region,
    color: regionColors[highlights.length % regionColors.length],
    type: "filled",
  });
}

/** Hidden, or invisible at zero opacity, as regions were hidden before highlights had `hidden`. */
export const isHidden = (highlight: Highlight) =>
  highlight.hidden === true || highlight.opacity === 0;

/**
 * Hides or shows a region's highlight, keeping its opacity and style. A region at zero
 * opacity has no opacity to return to, so showing it gives it its style's default.
 */
export function setHidden(
  browserStore: BrowserStoreInstance,
  highlight: Highlight,
  hidden: boolean,
) {
  const { hidden: _hidden, ...shown } = highlight;
  browserStore
    .getState()
    .updateHighlight(
      highlight.id,
      hidden
        ? { ...highlight, hidden: true }
        : { ...shown, opacity: highlight.opacity === 0 ? undefined : highlight.opacity },
    );
}

/** A highlight without a chromosome is drawn on whichever chromosome is shown. */
export function regionOf(highlight: Highlight, shownChromosome: string): GenomicRegion {
  const { chromosome = shownChromosome, start, end } = highlight.region;
  return { chromosome, start, end };
}

export const sameRegion = (a: GenomicRegion, b: GenomicRegion) =>
  a.chromosome === b.chromosome && a.start === b.start && a.end === b.end;
