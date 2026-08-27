import {
  createCompositeGeneGeometry,
  createGeneTranscriptGeometry,
  type CompositeGeneExonPart,
  type CompositeGeneIntronRun,
  type GeneExonPart,
  type GeneIntronPart,
} from "./geometry";
import type { GeneGlyphGeometry, GeneGlyphPartId } from "./glyph";
import type { GeneInteractionTarget } from "./interactions";
import type { GeneTranscript, GroupedGene } from "./types";

export type PreparedGeneGlyph = {
  geometry: GeneGlyphGeometry;
  targets: ReadonlyMap<GeneGlyphPartId, GeneInteractionTarget>;
};

export function prepareGeneTranscriptGlyph(transcript: GeneTranscript): PreparedGeneGlyph {
  const biologicalGeometry = createGeneTranscriptGeometry(transcript);
  const targets = new Map<GeneGlyphPartId, GeneInteractionTarget>();
  const introns = biologicalGeometry.introns.map((part) => {
    const id = transcriptIntronId(part);
    targets.set(id, { kind: "part", feature: transcript, part: { ...part, source: "transcript" } });
    return { id, kind: part.kind, start: part.start, end: part.end };
  });
  const exonParts = biologicalGeometry.exonParts.map((part) => {
    const id = transcriptExonId(part);
    targets.set(id, { kind: "part", feature: transcript, part: { ...part, source: "transcript" } });
    return { id, kind: part.kind, start: part.start, end: part.end };
  });

  return { geometry: { introns, exonParts }, targets };
}

export function prepareMergedGeneGlyph(gene: GroupedGene): PreparedGeneGlyph {
  const biologicalGeometry = createCompositeGeneGeometry(gene);
  const targets = new Map<GeneGlyphPartId, GeneInteractionTarget>();
  const introns = biologicalGeometry.intronRuns.map((part) => {
    const id = mergedIntronId(part);
    targets.set(id, { kind: "part", feature: gene, part: { ...part, source: "merged" } });
    return { id, kind: part.kind, start: part.start, end: part.end };
  });
  const exonParts = biologicalGeometry.exonParts.map((part) => {
    const id = mergedExonId(part);
    targets.set(id, { kind: "part", feature: gene, part: { ...part, source: "merged" } });
    return { id, kind: part.kind, start: part.start, end: part.end };
  });

  return { geometry: { introns, exonParts }, targets };
}

function transcriptIntronId(part: GeneIntronPart): GeneGlyphPartId {
  return `intron-${part.metadata.intronIndex}`;
}

function transcriptExonId(part: GeneExonPart): GeneGlyphPartId {
  return `${part.kind}-${part.metadata.exonIndex}-${part.start}-${part.end}`;
}

function mergedIntronId(part: CompositeGeneIntronRun): GeneGlyphPartId {
  return `intron-${part.start}-${part.end}`;
}

function mergedExonId(part: CompositeGeneExonPart): GeneGlyphPartId {
  return `${part.kind}-${part.start}-${part.end}`;
}
