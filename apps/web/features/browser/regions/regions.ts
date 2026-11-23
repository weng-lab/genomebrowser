import type {
  AssemblyDefinition,
  BrowserHighlightMutationResult,
  BrowserStoreInstance,
  GenomicRegion,
  Highlight,
  MutationFailure,
} from "@weng-lab/genomebrowser";
import { hexColorMessage, isHexColor, swatchColors } from "../../../shared/ui/color";

/**
 * Saved regions are the browser's highlights. A region keeps its highlight's ID for life and
 * shows the highlight's name, or its ID when it has none. Hiding the highlight keeps the
 * region and its style. They save with the session.
 */

/**
 * The color the `index`th new region or group takes: the color row's swatches in turn, from
 * blue, so its menu shows that color chosen.
 */
export const colorInTurn = (index: number) => swatchColors[(index + 1) % swatchColors.length].color;

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
 * next color in turn, so its menu shows that color chosen.
 */
export function saveRegion(browserStore: BrowserStoreInstance, region: GenomicRegion, name = "") {
  const { highlights, addHighlight } = browserStore.getState();
  addHighlight({
    id: crypto.randomUUID(),
    name: name.trim() || nextRegionName(highlights),
    region,
    color: colorInTurn(highlights.length),
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

/**
 * Colors the regions' highlights, keeping everything else about them. With `show`, it also
 * shows any that are hidden.
 */
export function setRegionsColor(
  browserStore: BrowserStoreInstance,
  ids: readonly string[],
  color: string,
  { show = false } = {},
): SetRegionsColorResult {
  if (!isHexColor(color))
    return { ok: false, code: "INVALID_COLOR", error: `${hexColorMessage}: ${color}` };
  return updateRegions(browserStore, ids, (highlight) => {
    if (!show) return { ...highlight, color };
    const { hidden: _hidden, ...shown } = highlight;
    return { ...shown, color };
  });
}

/** Renames a region. A blank name is ignored, keeping the one it has. */
export function renameRegion(browserStore: BrowserStoreInstance, id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: true } as const;
  return updateRegions(browserStore, [id], (highlight) => ({ ...highlight, name: trimmed }));
}

/** Moves a region to `region`, keeping its name and style. */
export function moveRegion(browserStore: BrowserStoreInstance, id: string, region: GenomicRegion) {
  return updateRegions(browserStore, [id], (highlight) => ({ ...highlight, region }));
}

/**
 * Colors a region's highlight and shows it, or, given null, hides it and keeps its color for
 * showing it again.
 */
export function setRegionColor(
  browserStore: BrowserStoreInstance,
  id: string,
  color: string | null,
): SetRegionsColorResult {
  if (color === null) return setRegionsHidden(browserStore, [id], true);
  return setRegionsColor(browserStore, [id], color, { show: true });
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
export const positionsOf = (region: Pick<GenomicRegion, "start" | "end">): Positions => ({
  start: formatPosition(region.start + 1),
  end: formatPosition(region.end),
});

/**
 * Reads a typed position: plain digits, or digits that commas group in threes. A misplaced
 * comma is refused, so a typo cannot quietly read as another position.
 */
function readPosition(text: string) {
  const typed = text.trim();
  return /^(\d+|\d{1,3}(,\d{3})+)$/.test(typed) ? Number(typed.replaceAll(",", "")) : undefined;
}

const positionFormat = (field: string) => `${field} must be a position like 5,225,001`;

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
  if (start === undefined) return { ok: false, field: "start", error: positionFormat("Start") };
  if (start < 1) return { ok: false, field: "start", error: "Start must be a position from 1" };
  if (end === undefined) return { ok: false, field: "end", error: positionFormat("End") };
  if (end < 1) return { ok: false, field: "end", error: "End must be a position from 1" };
  if (end < start) return { ok: false, field: "end", error: "End must be after start" };
  if (length !== undefined && end > length)
    return {
      ok: false,
      field: "end",
      error: `End must be within ${chromosome}, which ends at ${formatPosition(length)}`,
    };
  return { ok: true, region: { chromosome, start: start - 1, end } };
}
