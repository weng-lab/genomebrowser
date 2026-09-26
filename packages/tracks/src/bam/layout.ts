import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { createGenomicXScale } from "../shared/coordinates";
import { intersectsVisibleRegion } from "../shared/viewport";
import type { BamConfig, BamDisplay } from "./types";

export type BamGlyph = {
  /** Identifies the read across fetches, so it can keep its row. */
  key: string;
  record: BamRecord;
  start: number;
  end: number;
  label?: { x: number; end: number };
};
/** Rows previously assigned to reads, by glyph key. */
export type BamRowAssignment = ReadonlyMap<string, number>;

/**
 * Arranges alignments that already passed `filterBamRecords` into rows.
 *
 * Pack and squish rows do not depend on the viewport, so panning never moves a
 * read. Reads listed in `previous` keep their row when it is still free, and
 * other reads take the first free row, so reads also stay put when a pan loads
 * new data.
 */
export function layoutBam(
  records: BamRecord[],
  config: BamConfig,
  display: BamDisplay,
  region: GenomicRegion,
  visibleRegion: GenomicRegion,
  width: number,
  previous: BamRowAssignment = new Map(),
) {
  const x = createGenomicXScale(region, width);
  const rowHeight =
    display === "squish"
      ? Math.max(1, config.alignments.rowHeight / 2)
      : config.alignments.rowHeight;
  const fontSize = Math.min(11, rowHeight * 0.75);
  const labeled = (display === "pack" || display === "full") && rowHeight >= 10;
  const seen = new Map<string, number>();
  const glyphs: BamGlyph[] = records.map((record) => {
    const id = `${record.readName}:${record.start}:${record.flags}`;
    const repeat = seen.get(id) ?? 0;
    seen.set(id, repeat + 1);
    const start = Math.max(0, x(record.start));
    const end = Math.min(width, Math.max(start + 1, x(record.end)));
    const glyph: BamGlyph = { key: repeat ? `${id}:${repeat}` : id, record, start, end };
    // Labels always sit to the right so a read's footprint does not change with the viewport.
    if (labeled)
      glyph.label = { x: end + 5, end: end + 5 + record.readName.length * fontSize * 0.65 };
    return glyph;
  });
  const visible = (glyph: BamGlyph) => intersectsVisibleRegion(glyph.record, visibleRegion);
  const assignment = new Map<string, number>();
  if (display === "dense")
    return { rows: [glyphs], visibleRowCount: 1, hiddenCount: 0, rowHeight, fontSize, assignment };
  // Rows past the limit are not drawn. Coverage and junctions still count their reads.
  const maxRows = config.alignments.maxRows;
  if (display === "full") {
    const { rows, visibleRowCount } = fullRows(glyphs, visible);
    return {
      rows: rows.slice(0, maxRows),
      visibleRowCount: Math.min(visibleRowCount, maxRows),
      hiddenCount: Math.max(0, visibleRowCount - maxRows),
      rowHeight,
      fontSize,
      assignment,
    };
  }
  const rows = packStableRows(glyphs, previous, maxRows, assignment);
  let visibleRowCount = 0;
  let hiddenCount = 0;
  for (const glyph of glyphs) {
    if (!visible(glyph)) continue;
    const row = assignment.get(glyph.key);
    if (row === undefined) hiddenCount++;
    else visibleRowCount = Math.max(visibleRowCount, row + 1);
  }
  return { rows, visibleRowCount, hiddenCount, rowHeight, fontSize, assignment };
}

const ROW_GAP = 3;

/** First-fit packing that honors earlier row assignments. Unplaced reads get no row. */
function packStableRows(
  glyphs: BamGlyph[],
  previous: BamRowAssignment,
  maxRows: number,
  assignment: Map<string, number>,
) {
  const bounds = (glyph: BamGlyph) => [glyph.start, glyph.label?.end ?? glyph.end];
  // Each row keeps its reads sorted by start so a fit check is a binary search.
  const rows: BamGlyph[][] = [];
  const place = (glyph: BamGlyph, rowIndex: number) => {
    while (rows.length <= rowIndex) rows.push([]);
    const row = rows[rowIndex];
    const [start, end] = bounds(glyph);
    let low = 0;
    let high = row.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (row[middle].start < start) low = middle + 1;
      else high = middle;
    }
    const before = row[low - 1];
    const after = row[low];
    if (before && bounds(before)[1] + ROW_GAP > start) return false;
    if (after && end + ROW_GAP > after.start) return false;
    row.splice(low, 0, glyph);
    assignment.set(glyph.key, rowIndex);
    return true;
  };
  const sorted = glyphs.toSorted((left, right) => left.start - right.start);
  const pending: BamGlyph[] = [];
  for (const glyph of sorted) {
    const row = previous.get(glyph.key);
    if (row === undefined || row >= maxRows || !place(glyph, row)) pending.push(glyph);
  }
  for (const glyph of pending) {
    for (let row = 0; row < maxRows; row++) if (place(glyph, row)) break;
  }
  return rows;
}

function fullRows(glyphs: BamGlyph[], visible: (glyph: BamGlyph) => boolean) {
  const onScreen = glyphs.filter(visible);
  return {
    rows: [...onScreen, ...glyphs.filter((glyph) => !visible(glyph))].map((glyph) => [glyph]),
    visibleRowCount: onScreen.length,
  };
}

export function darkenBamColor(color: string): string {
  return (
    "#" +
    [1, 3, 5]
      .map((offset) =>
        Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.6)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
