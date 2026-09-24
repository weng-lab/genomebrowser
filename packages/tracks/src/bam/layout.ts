import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { createGenomicXScale } from "../shared/coordinates";
import { packViewportRows } from "../shared/layout/viewportRows";
import { intersectsVisibleRegion } from "../shared/viewport";
import type { BamConfig, BamDisplay } from "./types";

export type BamGlyph = {
  record: BamRecord;
  start: number;
  end: number;
  label?: { x: number; anchor: "start" | "end"; start: number; end: number };
};
export function layoutBam(
  records: BamRecord[],
  config: BamConfig,
  display: BamDisplay,
  region: GenomicRegion,
  visibleRegion: GenomicRegion,
  width: number,
) {
  const x = createGenomicXScale(region, width);
  const rowHeight = display === "squish" ? Math.max(1, config.rowHeight / 2) : config.rowHeight;
  const fontSize = Math.min(11, rowHeight * 0.75);
  const viewportStart = Math.max(0, x(visibleRegion.start));
  const viewportEnd = Math.min(width, x(visibleRegion.end));
  const glyphs: BamGlyph[] = records
    .filter(
      (record) =>
        intersectsVisibleRegion(record, region) &&
        (record.flags & 4) === 0 &&
        (config.showDuplicates || !(record.flags & 1024)) &&
        // MAPQ 255 is unavailable, not evidence of high confidence.
        (config.minimumMappingQuality === 0 ||
          (record.mappingQuality !== 255 && record.mappingQuality >= config.minimumMappingQuality)),
    )
    .map((record) => {
      const start = Math.max(0, x(record.start));
      const end = Math.min(width, Math.max(start + 1, x(record.end)));
      const glyph: BamGlyph = { record, start, end };
      if ((display === "pack" || display === "full") && rowHeight >= 10) {
        const labelWidth = record.readName.length * fontSize * 0.65;
        if (end >= viewportStart && end + 5 + labelWidth <= viewportEnd) {
          glyph.label = { x: end + 5, anchor: "start", start: end + 5, end: end + 5 + labelWidth };
        } else if (start <= viewportEnd && start - 5 - labelWidth >= viewportStart) {
          glyph.label = {
            x: start - 5,
            anchor: "end",
            start: start - 5 - labelWidth,
            end: start - 5,
          };
        }
      }
      return glyph;
    });
  const visible = (glyph: BamGlyph) => intersectsVisibleRegion(glyph.record, visibleRegion);
  if (display === "dense") return { rows: [glyphs], visibleRowCount: 1, rowHeight, fontSize };
  if (display === "full") {
    const onScreen = glyphs.filter(visible);
    return {
      rows: [...onScreen, ...glyphs.filter((glyph) => !visible(glyph))].map((glyph) => [glyph]),
      visibleRowCount: onScreen.length,
      rowHeight,
      fontSize,
    };
  }
  const packed = packViewportRows(
    glyphs,
    (glyph) => ({
      start: Math.min(glyph.start, glyph.label?.start ?? glyph.start),
      end: Math.max(glyph.end, glyph.label?.end ?? glyph.end),
    }),
    visible,
    { gap: 3 },
  );
  return { ...packed, rowHeight, fontSize };
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
