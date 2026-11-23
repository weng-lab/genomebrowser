import {
  type AssemblyDefinition,
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

/**
 * The name a new region takes when it is not given one: “Region” and the number after the
 * highest one taken, so it never repeats a name in that form.
 */
export function nextRegionName(highlights: readonly Highlight[]) {
  const taken = highlights.map((highlight) => /^Region (\d+)$/.exec(regionName(highlight)));
  return `Region ${Math.max(0, ...taken.map((match) => (match ? Number(match[1]) : 0))) + 1}`;
}

/**
 * Saves `region` as a new region named `name`, or `nextRegionName` when it is blank, with the
 * next color in turn.
 */
export function saveRegion(browserStore: BrowserStoreInstance, region: GenomicRegion, name = "") {
  const { highlights, addHighlight } = browserStore.getState();
  addHighlight({
    id: crypto.randomUUID(),
    name: name.trim() || nextRegionName(highlights),
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

/** Typed start and end positions: one-based and inclusive, as regions show them. */
export type Positions = { start: string; end: string };

export type PositionsResult =
  | { ok: true; region: GenomicRegion }
  | { ok: false; field: keyof Positions; error: string };

/** A position as regions show it, with its digits grouped by commas. */
export const formatPosition = (position: number) => position.toLocaleString("en-US");

/** Shows `region`'s bounds as the positions a person would type for it. */
export const positionsOf = (region: GenomicRegion): Positions => ({
  start: formatPosition(region.start + 1),
  end: formatPosition(region.end),
});

/** Reads a typed position: whole digits, which commas may group. */
function readPosition(text: string) {
  const digits = text.trim().replaceAll(",", "");
  return /^\d+$/.test(digits) ? Number(digits) : undefined;
}

/**
 * The region on `chromosome` between typed `positions`, or the field at fault and why. The
 * region must lie within the chromosome.
 */
export function regionFromPositions(
  chromosome: string,
  positions: Positions,
  assembly: AssemblyDefinition,
): PositionsResult {
  const start = readPosition(positions.start);
  const end = readPosition(positions.end);
  const length = assembly.chromosomes[chromosome];
  if (start === undefined || start < 1)
    return { ok: false, field: "start", error: "Start must be a position from 1" };
  if (end === undefined || end < 1)
    return { ok: false, field: "end", error: "End must be a position from 1" };
  if (end < start) return { ok: false, field: "end", error: "End must be after start" };
  if (length !== undefined && end > length)
    return {
      ok: false,
      field: "end",
      error: `End must be within ${chromosome}, which ends at ${formatPosition(length)}`,
    };
  return { ok: true, region: { chromosome, start: start - 1, end } };
}
