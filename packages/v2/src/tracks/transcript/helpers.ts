import type { Exon, GenomicElement, RenderedTranscript, Transcript, TranscriptList } from "./types";

type Feature<T> = T & { coordinates: { start: number; end: number }; name: string };

export function isManeSelectTranscript(tag: string | undefined | null): boolean {
  return !!tag?.includes("MANE_Select");
}

export function mergeTranscripts(gene: TranscriptList): Transcript {
  const allExons = gene.transcripts.flatMap((transcript) => transcript.exons ?? []).sort(compareElements);
  const exons = mergeExons(allExons);
  const starts = allExons.map((exon) => exon.coordinates.start);
  const ends = allExons.map((exon) => exon.coordinates.end);

  return {
    name: gene.name ?? "",
    strand: gene.strand,
    id: gene.id ?? "",
    coordinates: {
      start: starts.length ? Math.min(...starts) : 0,
      end: ends.length ? Math.max(...ends) : 0,
    },
    exons,
    color: "",
  };
}

export function sortedTranscripts(genes: TranscriptList[]): Transcript[] {
  return genes
    .flatMap((gene) => gene.transcripts.map((transcript) => ({ ...transcript, strand: gene.strand })))
    .sort((a, b) => a.coordinates.start - b.coordinates.start);
}

export function renderTranscript(
  transcript: Transcript,
  x: (value: number) => number,
  rowHeight: number,
  width: number,
): RenderedTranscript {
  const rendered = convertTranscriptCoordinates(transcript, x);
  return {
    transcript: rendered,
    paths: {
      exons: rendered.exons?.reduce((path, exon) => path + exonPath(exon, rowHeight / 2, rowHeight, width), "") ?? "",
      introns: intronPath(
        rendered.coordinates.start,
        rendered.coordinates.end,
        rendered.strand,
        rowHeight / 2,
        rowHeight * 0.19,
        width,
      ),
    },
  };
}

export function groupFeatures<T extends Feature<unknown>>(
  features: T[],
  x: (value: number) => number,
  fontSize: number,
  margin = 10,
): T[][] {
  return features.reduce<T[][]>((groups, feature) => {
    for (const group of groups) {
      const previous = group[group.length - 1];
      if (
        x(previous.coordinates.end) + margin + fontSize * previous.name.length <=
        x(feature.coordinates.start)
      ) {
        group.push(feature);
        return groups;
      }
    }
    groups.push([feature]);
    return groups;
  }, []);
}

function mergeExons(exons: Exon[]): Exon[] {
  if (exons.length === 0) return [];
  const merged: Exon[] = [{ coordinates: { ...exons[0].coordinates }, UTRs: exons[0].UTRs && [...exons[0].UTRs] }];

  for (const exon of exons.slice(1)) {
    const previous = merged[merged.length - 1];
    if (exon.coordinates.start < previous.coordinates.end) {
      previous.UTRs = [...(previous.UTRs ?? []), ...(exon.UTRs ?? [])];
      previous.coordinates.end = Math.max(previous.coordinates.end, exon.coordinates.end);
    } else {
      merged.push({ coordinates: { ...exon.coordinates }, UTRs: exon.UTRs && [...exon.UTRs] });
    }
  }

  for (const exon of merged) exon.UTRs = mergeUTRs(exon.UTRs ?? []);
  return merged;
}

function mergeUTRs(utrs: GenomicElement[]): GenomicElement[] {
  if (utrs.length === 0) return [];
  const sorted = [...utrs].sort(compareElements);
  const merged: GenomicElement[] = [{ coordinates: { ...sorted[0].coordinates } }];

  for (const utr of sorted.slice(1)) {
    const previous = merged[merged.length - 1];
    if (utr.coordinates.start < previous.coordinates.end) {
      previous.coordinates.end = Math.max(previous.coordinates.end, utr.coordinates.end);
    } else {
      merged.push({ coordinates: { ...utr.coordinates } });
    }
  }

  return merged;
}

function convertTranscriptCoordinates(transcript: Transcript, x: (value: number) => number): Transcript {
  return {
    ...transcript,
    coordinates: {
      start: x(transcript.coordinates.start),
      end: x(transcript.coordinates.end),
    },
    exons:
      transcript.exons?.map((exon) => ({
        coordinates: {
          start: x(exon.coordinates.start),
          end: x(exon.coordinates.end),
        },
        UTRs:
          exon.UTRs?.map((utr) => ({
            coordinates: {
              start: x(utr.coordinates.start),
              end: x(utr.coordinates.end),
            },
          })) ?? [],
      })) ?? [],
  };
}

function intronPath(start: number, end: number, strand: string, y: number, h: number, width: number): string {
  let path = "";
  const clampedStart = Math.max(0, start);
  const clampedEnd = Math.min(width, end);

  if (strand === "+") {
    for (let i = clampedStart + 10; i < clampedEnd - 10; i += 20) {
      path += move(i - h, y - h) + line(i, y) + line(i - h, y + h) + line(i, y) + line(i - h, y - h);
    }
  } else if (strand === "-") {
    for (let i = clampedStart + 10; i < clampedEnd - 10; i += 20) {
      path += move(i + h, y - h) + line(i, y) + line(i + h, y + h) + line(i, y) + line(i + h, y - h);
    }
  }

  return `${path} M ${clampedStart} ${y} L ${clampedEnd} ${y}`;
}

function exonPath(exon: Exon, y: number, h: number, width: number): string {
  if (exon.coordinates.start > width || exon.coordinates.end < 0) return "";

  const startUtr = exon.UTRs?.filter((utr) => utr.coordinates.start === exon.coordinates.start) ?? [];
  const endUtr = exon.UTRs?.filter((utr) => utr.coordinates.end === exon.coordinates.end) ?? [];
  const utrTop = y - h * 0.2;
  const utrBottom = y + h * 0.2;
  const exonTop = y - h * 0.3;
  const exonBottom = y + h * 0.3;

  if (!startUtr[0] && !endUtr[0]) {
    return rectPath(exon.coordinates.start, exonTop, exon.coordinates.end, exonBottom);
  }

  if (startUtr[0] && startUtr[0].coordinates.end === exon.coordinates.end) {
    return rectPath(startUtr[0].coordinates.start, utrTop, startUtr[0].coordinates.end, utrBottom);
  }

  let path = startUtr[0]
    ? move(startUtr[0].coordinates.start, utrTop) +
      line(startUtr[0].coordinates.end, utrTop) +
      line(startUtr[0].coordinates.end, exonTop)
    : move(exon.coordinates.start, exonTop);

  path += endUtr[0]
    ? line(endUtr[0].coordinates.start, exonTop) +
      line(endUtr[0].coordinates.start, utrTop) +
      line(endUtr[0].coordinates.end, utrTop) +
      line(endUtr[0].coordinates.end, utrBottom) +
      line(endUtr[0].coordinates.start, utrBottom) +
      line(endUtr[0].coordinates.start, exonBottom)
    : line(exon.coordinates.end, exonTop) + line(exon.coordinates.end, exonBottom);

  return (
    path +
    (startUtr[0]
      ? line(startUtr[0].coordinates.end, exonBottom) +
        line(startUtr[0].coordinates.end, utrBottom) +
        line(startUtr[0].coordinates.start, utrBottom) +
        line(startUtr[0].coordinates.start, utrTop)
      : line(exon.coordinates.start, exonBottom) + line(exon.coordinates.start, exonTop))
  );
}

function rectPath(x1: number, y1: number, x2: number, y2: number): string {
  return move(x1, y1) + line(x2, y1) + line(x2, y2) + line(x1, y2) + line(x1, y1);
}

function compareElements(a: GenomicElement, b: GenomicElement) {
  return a.coordinates.start === b.coordinates.start
    ? a.coordinates.end - b.coordinates.end
    : a.coordinates.start - b.coordinates.start;
}

function move(x: number, y: number): string {
  return ` M ${x} ${y}`;
}

function line(x: number, y: number): string {
  return ` L ${x} ${y}`;
}
