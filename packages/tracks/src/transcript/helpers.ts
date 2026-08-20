import type { Exon, GenomicElement, RenderedTranscript, Transcript, TranscriptList } from "./types";
export function isManeSelectTranscript(tag: string | undefined | null) {
  return !!tag?.includes("MANE_Select");
}
export function mergeTranscripts(gene: TranscriptList): Transcript {
  const all = gene.transcripts.flatMap((transcript) => transcript.exons ?? []).toSorted(compare);
  const exons = mergeElements(all) as Exon[];
  const starts = all.map((exon) => exon.coordinates.start);
  const ends = all.map((exon) => exon.coordinates.end);
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
export function sortedTranscripts(genes: TranscriptList[]) {
  return genes
    .flatMap((gene) =>
      gene.transcripts.map((transcript) => ({ ...transcript, strand: gene.strand })),
    )
    .sort((a, b) => a.coordinates.start - b.coordinates.start);
}
export function renderTranscript(
  transcript: Transcript,
  x: (value: number) => number,
  rowHeight: number,
  width: number,
): RenderedTranscript {
  const rendered = convert(transcript, x);
  return {
    transcript: rendered,
    paths: {
      exons:
        rendered.exons?.reduce(
          (path, exon) => path + exonPath(exon, rowHeight / 2, rowHeight, width),
          "",
        ) ?? "",
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
function mergeElements(exons: Exon[]) {
  if (!exons.length) return [];
  const merged: Exon[] = [
    { coordinates: { ...exons[0].coordinates }, UTRs: exons[0].UTRs && [...exons[0].UTRs] },
  ];
  for (const exon of exons.slice(1)) {
    const previous = merged[merged.length - 1];
    if (exon.coordinates.start < previous.coordinates.end) {
      previous.UTRs = [...(previous.UTRs ?? []), ...(exon.UTRs ?? [])];
      previous.coordinates.end = Math.max(previous.coordinates.end, exon.coordinates.end);
    } else merged.push({ coordinates: { ...exon.coordinates }, UTRs: exon.UTRs && [...exon.UTRs] });
  }
  for (const exon of merged) exon.UTRs = mergeUtrs(exon.UTRs ?? []);
  return merged;
}
function mergeUtrs(utrs: GenomicElement[]) {
  if (!utrs.length) return [];
  const sorted = utrs.toSorted(compare);
  const merged = [{ coordinates: { ...sorted[0].coordinates } }];
  for (const utr of sorted.slice(1)) {
    const previous = merged[merged.length - 1];
    if (utr.coordinates.start < previous.coordinates.end)
      previous.coordinates.end = Math.max(previous.coordinates.end, utr.coordinates.end);
    else merged.push({ coordinates: { ...utr.coordinates } });
  }
  return merged;
}
function convert(transcript: Transcript, x: (value: number) => number): Transcript {
  return {
    ...transcript,
    coordinates: { start: x(transcript.coordinates.start), end: x(transcript.coordinates.end) },
    exons:
      transcript.exons?.map((exon) => ({
        coordinates: { start: x(exon.coordinates.start), end: x(exon.coordinates.end) },
        UTRs:
          exon.UTRs?.map((utr) => ({
            coordinates: { start: x(utr.coordinates.start), end: x(utr.coordinates.end) },
          })) ?? [],
      })) ?? [],
  };
}
function intronPath(
  start: number,
  end: number,
  strand: string,
  y: number,
  h: number,
  width: number,
) {
  let path = "";
  const a = Math.max(0, start);
  const b = Math.min(width, end);
  for (let i = a + 10; i < b - 10; i += 20) {
    if (strand === "+")
      path +=
        move(i - h, y - h) + line(i, y) + line(i - h, y + h) + line(i, y) + line(i - h, y - h);
    else if (strand === "-")
      path +=
        move(i + h, y - h) + line(i, y) + line(i + h, y + h) + line(i, y) + line(i + h, y - h);
  }
  return `${path} M ${a} ${y} L ${b} ${y}`;
}
function exonPath(exon: Exon, y: number, h: number, width: number) {
  if (exon.coordinates.start > width || exon.coordinates.end < 0) return "";
  const start = exon.UTRs?.find((utr) => utr.coordinates.start === exon.coordinates.start);
  const end = exon.UTRs?.find((utr) => utr.coordinates.end === exon.coordinates.end);
  const ut = y - h * 0.2;
  const ub = y + h * 0.2;
  const et = y - h * 0.3;
  const eb = y + h * 0.3;
  if (!start && !end) return rect(exon.coordinates.start, et, exon.coordinates.end, eb);
  if (start && start.coordinates.end === exon.coordinates.end)
    return rect(start.coordinates.start, ut, start.coordinates.end, ub);
  let path = start
    ? move(start.coordinates.start, ut) +
      line(start.coordinates.end, ut) +
      line(start.coordinates.end, et)
    : move(exon.coordinates.start, et);
  path += end
    ? line(end.coordinates.start, et) +
      line(end.coordinates.start, ut) +
      line(end.coordinates.end, ut) +
      line(end.coordinates.end, ub) +
      line(end.coordinates.start, ub) +
      line(end.coordinates.start, eb)
    : line(exon.coordinates.end, et) + line(exon.coordinates.end, eb);
  return (
    path +
    (start
      ? line(start.coordinates.end, eb) +
        line(start.coordinates.end, ub) +
        line(start.coordinates.start, ub) +
        line(start.coordinates.start, ut)
      : line(exon.coordinates.start, eb) + line(exon.coordinates.start, et))
  );
}
function rect(x1: number, y1: number, x2: number, y2: number) {
  return move(x1, y1) + line(x2, y1) + line(x2, y2) + line(x1, y2) + line(x1, y1);
}
function compare(a: GenomicElement, b: GenomicElement) {
  return a.coordinates.start === b.coordinates.start
    ? a.coordinates.end - b.coordinates.end
    : a.coordinates.start - b.coordinates.start;
}
function move(x: number, y: number) {
  return ` M ${x} ${y}`;
}
function line(x: number, y: number) {
  return ` L ${x} ${y}`;
}
