import {
  type BrowserStoreInstance,
  type GenomicRegion,
  type Highlight,
} from "@weng-lab/genomebrowser";

/**
 * Saved regions are the browser's highlights: a highlight's ID is its region's name, and
 * zero opacity hides the highlight without losing the region. They save with the session.
 */

/** Colors new regions take in turn. */
const regionColors = ["#1976d2", "#f59e0b", "#2e7d32", "#9c27b0", "#d32f2f", "#00838f"];

/** Saves `region` as a new region named "Region N", with the next color in turn. */
export function saveRegion(browserStore: BrowserStoreInstance, region: GenomicRegion) {
  const { highlights, addHighlight } = browserStore.getState();
  const names = new Set(highlights.map((highlight) => highlight.id));
  let number = highlights.length + 1;
  while (names.has(`Region ${number}`)) number++;
  addHighlight({
    id: `Region ${number}`,
    region,
    color: regionColors[highlights.length % regionColors.length],
    type: "filled",
  });
}

/** Replaces the region named `id`, keeping its place in the list. */
export function updateRegion(browserStore: BrowserStoreInstance, id: string, next: Highlight) {
  browserStore.setState((state) => ({
    highlights: state.highlights.map((highlight) => (highlight.id === id ? next : highlight)),
  }));
}

export const isHidden = (highlight: Highlight) => highlight.opacity === 0;

/** Hides or shows a region's highlight. Showing it restores the default opacity for its style. */
export function setHidden(
  browserStore: BrowserStoreInstance,
  highlight: Highlight,
  hidden: boolean,
) {
  updateRegion(browserStore, highlight.id, { ...highlight, opacity: hidden ? 0 : undefined });
}

/** A highlight without a chromosome is drawn on whichever chromosome is shown. */
export function regionOf(highlight: Highlight, shownChromosome: string): GenomicRegion {
  const { chromosome = shownChromosome, start, end } = highlight.region;
  return { chromosome, start, end };
}

export const sameRegion = (a: GenomicRegion, b: GenomicRegion) =>
  a.chromosome === b.chromosome && a.start === b.start && a.end === b.end;
