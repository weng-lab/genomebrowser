import { l, m } from "../../../utils/svg";
import { Exon, RenderedTranscript, Transcript, TranscriptList } from "./types";
export interface GenomicElement {
  coordinates: { start: number; end: number };
}
function compareElements(a: GenomicElement, b: GenomicElement) {
  return a.coordinates.start === b.coordinates.start
    ? a.coordinates.end - b.coordinates.end
    : a.coordinates.start - b.coordinates.start;
}

export function mergeTranscripts(gene: TranscriptList): Transcript {
  const transcripts = gene.transcripts;
  const allExons = transcripts.reduce<Exon[]>((e, t) => [...e, ...(t.exons || [])], []).sort(compareElements);
  const exons =
    allExons.length === 0
      ? []
      : [{ coordinates: { ...allExons[0].coordinates }, UTRs: allExons[0].UTRs && [...allExons[0].UTRs] }];
  // const colors = new Set(gene.transcripts.map((x) => x.color));
  allExons.slice(1).forEach((exon) => {
    if (exon.coordinates.start < exons[exons.length - 1].coordinates.end) {
      exons[exons.length - 1].UTRs = [...(exons[exons.length - 1].UTRs || []), ...(exon.UTRs || [])];
      exons[exons.length - 1].coordinates.end = Math.max(exon.coordinates.end, exons[exons.length - 1].coordinates.end);
    } else exons.push({ coordinates: { ...exon.coordinates }, UTRs: exon.UTRs && [...exon.UTRs] });
  });
  exons.forEach((exon) => {
    exon.UTRs = mergeUTRs(exon.UTRs || []);
  });
  // let color = colors.size === 1 ? colors.values().next().value : undefined;

  // if (name) {
  //   color = gene.name?.includes(name) ? "#ff5555" : color;
  // }
  return {
    name: gene.name || "",
    strand: gene.strand,
    id: gene.id || "",
    coordinates: {
      start: Math.min(...allExons.map((e) => e.coordinates.start)),
      end: Math.max(...allExons.map((e) => e.coordinates.end)),
    },
    exons,
    color: "",
  };
}

export function mergeUTRs(utrs: GenomicElement[]): GenomicElement[] {
  if (utrs.length === 0) return [];
  const results: GenomicElement[] = [{ coordinates: { ...utrs[0].coordinates } }];
  utrs.slice(1).forEach((utr) => {
    if (utr.coordinates.start < results[results.length - 1].coordinates.end)
      results[results.length - 1].coordinates.end = Math.max(
        results[results.length - 1].coordinates.end,
        utr.coordinates.end
      );
    else results.push({ coordinates: { ...utr.coordinates } });
  });
  return results;
}

export function renderTranscript(
  uTranscript: Transcript,
  x: (value: number) => number,
  // domain: { start: number; end: number },
  rowHeight: number,
  width: number
): RenderedTranscript {
  const transcript = convertTranscriptCoordinates(uTranscript, x);
  const paths = {
    exons: transcript.exons?.reduce((p, exon) => p + exonPath(exon, rowHeight / 2, rowHeight, width), "") || "",
    introns: intronPath(
      transcript.coordinates.start,
      transcript.coordinates.end,
      transcript.strand,
      rowHeight / 2,
      rowHeight * 0.19,
      width
    ),
  };
  return { transcript, paths };
}

export function convertTranscriptCoordinates(
  transcript: Transcript,
  x: (x: number) => number
  // domain: { start: number; end: number }
): Transcript {
  return {
    strand: transcript.strand,
    name: transcript.name,
    id: transcript.id,
    color: transcript.color,
    coordinates: {
      end: x(transcript.coordinates.end),
      start: x(transcript.coordinates.start),
    },
    exons:
      transcript.exons
        // ?.filter((exon) => exon.coordinates.end > domain.start && exon.coordinates.start < domain.end)
        ?.map((exon) => ({
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
            })) || [],
        })) || [],
  };
}

export function sortedTranscripts(genes: TranscriptList[]): Transcript[] {
  return genes
    .reduce<Transcript[]>((cpacked, gene) => {
      gene.transcripts.forEach((transcript) => cpacked.push({ ...transcript, strand: gene.strand }));
      return cpacked;
    }, [])
    .sort((a, b) => a.coordinates.start - b.coordinates.start);
}

export function intronPath(start: number, end: number, strand: string, y: number, h: number, w: number): string {
  let retval = "";
  start = start < 0 ? 0 : start;
  end = end > w ? w : end;
  if (strand === "+")
    for (let i = start + 10; i < end - 10; i += 20)
      retval += m(i - h, y - h) + l(i, y) + l(i - h, y + h) + l(i, y) + l(i - h, y - h);
  else if (strand === "-")
    for (let i = start + 10; i < end - 10; i += 20)
      retval += m(i + h, y - h) + l(i, y) + l(i + h, y + h) + l(i, y) + l(i + h, y - h);
  return retval + " M " + start + " " + y + " L " + end + " " + y;
}

export function exonPath(exon: Exon, y: number, h: number, w: number): string {
  /* check to make sure we are within range */
  if (exon.coordinates.start > w || exon.coordinates.end < 0) return "";

  /* get starting and ending UTRs if they are present */
  const sutr = exon.UTRs?.filter((utr) => utr.coordinates.start === exon.coordinates.start) || [];
  const eutr = exon.UTRs?.filter((utr) => utr.coordinates.end === exon.coordinates.end) || [];
  const utrh = y - h * 0.2,
    utrhn = y + h * 0.2,
    eh = y - h * 0.3,
    ehn = y + h * 0.3;

  // if it has no UTRs, draw a single rect
  if (!sutr[0] && !eutr[0])
    return (
      m(exon.coordinates.start, eh) +
      l(exon.coordinates.end, eh) +
      l(exon.coordinates.end, ehn) +
      l(exon.coordinates.start, ehn) +
      l(exon.coordinates.start, eh)
    );

  // if it is all one single UTR, draw one rect
  if (sutr[0] && sutr[0].coordinates.end === exon.coordinates.end)
    return (
      m(sutr[0].coordinates.start, utrh) +
      l(sutr[0].coordinates.end, utrh) +
      l(sutr[0].coordinates.end, utrhn) +
      l(sutr[0].coordinates.start, utrhn) +
      l(sutr[0].coordinates.start, utrh)
    );

  // construct path with starting and ending UTRs included
  let retval = sutr[0]
    ? m(sutr[0].coordinates.start, utrh) + l(sutr[0].coordinates.end, utrh) + l(sutr[0].coordinates.end, eh)
    : m(exon.coordinates.start, eh);
  retval += eutr[0]
    ? l(eutr[0].coordinates.start, eh) +
      l(eutr[0].coordinates.start, utrh) +
      l(eutr[0].coordinates.end, utrh) +
      l(eutr[0].coordinates.end, utrhn) +
      l(eutr[0].coordinates.start, utrhn) +
      l(eutr[0].coordinates.start, ehn)
    : l(exon.coordinates.end, eh) + l(exon.coordinates.end, ehn);
  return (
    retval +
    (sutr[0]
      ? l(sutr[0].coordinates.end, ehn) +
        l(sutr[0].coordinates.end, utrhn) +
        l(sutr[0].coordinates.start, utrhn) +
        l(sutr[0].coordinates.start, utrh)
      : l(exon.coordinates.start, ehn) + l(exon.coordinates.start, eh))
  );
}

export const getRealTranscript = (transcript: Transcript, reverseX: (value: number) => number) => {
  const realStart = reverseX(transcript.coordinates.start);
  const realEnd = reverseX(transcript.coordinates.end);
  const realDomain = {
    start: Math.round(realStart),
    end: Math.round(realEnd),
  };
  const realTranscript = {
    ...transcript,
    coordinates: realDomain,
  };
  return realTranscript;
};
