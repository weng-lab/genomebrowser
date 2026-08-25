import type { GeneExon, GeneTranscript, GroupedGene } from "./types";

export type GeneExonPartKind = "utr" | "cds" | "noncoding-exon";
export type GeneUtrSide = "5-prime" | "3-prime";

type GeneExonPartBase = {
  start: number;
  end: number;
  metadata: {
    exonIndex: number;
    transcriptionIndex: number;
    frame: GeneExon["frame"];
  };
};

export type GeneUtrPart = GeneExonPartBase & {
  kind: "utr";
  metadata: GeneExonPartBase["metadata"] & { side: GeneUtrSide };
};

export type GeneCdsPart = GeneExonPartBase & { kind: "cds" };
export type GeneNoncodingExonPart = GeneExonPartBase & { kind: "noncoding-exon" };
export type GeneExonPart = GeneUtrPart | GeneCdsPart | GeneNoncodingExonPart;

export type GeneIntronPart = {
  kind: "intron";
  start: number;
  end: number;
  metadata: {
    intronIndex: number;
    transcriptionIndex: number;
  };
};

export type GeneTranscriptGeometry = {
  introns: GeneIntronPart[];
  exonParts: GeneExonPart[];
};

export type CompositeGeneContribution = {
  transcriptId: string;
  kind: "intron" | GeneExonPartKind;
  utrSide: GeneUtrSide | null;
};

export type CompositeGenePartMetadata = {
  winningContributions: CompositeGeneContribution[];
  overriddenContributions: CompositeGeneContribution[];
  utrSides: GeneUtrSide[];
};

export type CompositeGeneIntronPart = {
  kind: "intron";
  start: number;
  end: number;
  metadata: CompositeGenePartMetadata;
};

export type CompositeGeneExonPart = {
  kind: GeneExonPartKind;
  start: number;
  end: number;
  metadata: CompositeGenePartMetadata;
};

export type CompositeGeneIntronRun = {
  kind: "intron";
  start: number;
  end: number;
};

export type CompositeGeneGeometry = {
  atoms: CompositeGenePart[];
  introns: CompositeGeneIntronPart[];
  intronRuns: CompositeGeneIntronRun[];
  exonParts: CompositeGeneExonPart[];
};

export function createGeneTranscriptGeometry(transcript: GeneTranscript): GeneTranscriptGeometry {
  const { exons } = transcript;
  const codingStart = transcript.source.thickStart;
  const codingEnd = transcript.source.thickEnd;
  const isCoding = codingStart < codingEnd;
  const exonParts = exons.flatMap((exon, exonIndex): GeneExonPart[] => {
    const metadata = {
      exonIndex,
      transcriptionIndex: transcriptionIndex(exonIndex, exons.length, transcript.strand),
      frame: exon.frame,
    };
    if (!isCoding) return [{ kind: "noncoding-exon", start: exon.start, end: exon.end, metadata }];

    const parts: GeneExonPart[] = [];
    addUtrPart(
      parts,
      exon.start,
      Math.min(exon.end, codingStart),
      metadata,
      transcript.strand === "+" ? "5-prime" : "3-prime",
    );
    addExonPart(
      parts,
      "cds",
      Math.max(exon.start, codingStart),
      Math.min(exon.end, codingEnd),
      metadata,
    );
    addUtrPart(
      parts,
      Math.max(exon.start, codingEnd),
      exon.end,
      metadata,
      transcript.strand === "+" ? "3-prime" : "5-prime",
    );
    return parts;
  });
  const introns = exons.slice(0, -1).flatMap((exon, intronIndex): GeneIntronPart[] => {
    const end = exons[intronIndex + 1]!.start;
    if (exon.end >= end) return [];
    return [
      {
        kind: "intron",
        start: exon.end,
        end,
        metadata: {
          intronIndex,
          transcriptionIndex: transcriptionIndex(intronIndex, exons.length - 1, transcript.strand),
        },
      },
    ];
  });

  return { introns, exonParts };
}

export function createCompositeGeneGeometry(gene: GroupedGene): CompositeGeneGeometry {
  let contributionOrder = 0;
  const contributions: CompositeContribution[] = gene.transcripts.flatMap((transcript) => {
    const geometry = createGeneTranscriptGeometry(transcript);
    return [
      ...geometry.introns.map((part) =>
        createContribution(part, transcript.transcriptId, null, contributionOrder++),
      ),
      ...geometry.exonParts.map((part) =>
        createContribution(
          part,
          transcript.transcriptId,
          part.kind === "utr" ? part.metadata.side : null,
          contributionOrder++,
        ),
      ),
    ];
  });
  const events = contributions
    .flatMap((contribution): SweepEvent[] => [
      { position: contribution.start, type: "start", contribution },
      { position: contribution.end, type: "end", contribution },
    ])
    .toSorted(
      (left, right) =>
        left.position - right.position ||
        eventOrder[left.type] - eventOrder[right.type] ||
        left.contribution.order - right.contribution.order,
    );
  const active = new Map<number, CompositeContribution>();
  const parts: CompositeGenePart[] = [];
  let cursor = events[0]?.position;
  let eventIndex = 0;

  while (eventIndex < events.length) {
    const position = events[eventIndex]!.position;
    if (cursor !== undefined && cursor < position && active.size > 0) {
      appendCompositeAtom(parts, cursor, position, [...active.values()].toSorted(byOrder));
    }
    while (eventIndex < events.length && events[eventIndex]!.position === position) {
      const event = events[eventIndex]!;
      if (event.type === "end") active.delete(event.contribution.id);
      else active.set(event.contribution.id, event.contribution);
      eventIndex += 1;
    }
    cursor = position;
  }

  const introns = parts.filter((part): part is CompositeGeneIntronPart => part.kind === "intron");
  return {
    atoms: parts,
    introns,
    intronRuns: createCompositeIntronRuns(introns),
    exonParts: parts.filter((part): part is CompositeGeneExonPart => part.kind !== "intron"),
  };
}

export type CompositeGenePart = CompositeGeneIntronPart | CompositeGeneExonPart;
type CompositeContribution = CompositeGeneContribution & {
  id: number;
  order: number;
  start: number;
  end: number;
};
type SweepEvent = {
  position: number;
  type: "start" | "end";
  contribution: CompositeContribution;
};

const partPriority: Record<CompositeGenePart["kind"], number> = {
  intron: 0,
  "noncoding-exon": 1,
  utr: 2,
  cds: 3,
};
const utrSideOrder: GeneUtrSide[] = ["5-prime", "3-prime"];
const eventOrder: Record<SweepEvent["type"], number> = { end: 0, start: 1 };

function createContribution(
  part: GeneIntronPart | GeneExonPart,
  transcriptId: string,
  utrSide: GeneUtrSide | null,
  order: number,
): CompositeContribution {
  return {
    id: order,
    order,
    kind: part.kind,
    start: part.start,
    end: part.end,
    transcriptId,
    utrSide,
  };
}

function appendCompositeAtom(
  parts: CompositeGenePart[],
  start: number,
  end: number,
  contributions: CompositeContribution[],
) {
  const kind = contributions.reduce(
    (winner, part) => (partPriority[part.kind] > partPriority[winner] ? part.kind : winner),
    contributions[0]!.kind,
  );
  const winningContributions: CompositeGeneContribution[] = [];
  const overriddenContributions: CompositeGeneContribution[] = [];
  const winningUtrSides = new Set<GeneUtrSide>();
  for (const contribution of contributions) {
    const metadataContribution = toMetadataContribution(contribution);
    if (contribution.kind === kind) {
      winningContributions.push(metadataContribution);
      if (contribution.utrSide) winningUtrSides.add(contribution.utrSide);
    } else {
      overriddenContributions.push(metadataContribution);
    }
  }
  const metadata: CompositeGenePartMetadata = {
    winningContributions,
    overriddenContributions,
    utrSides: utrSideOrder.filter((side) => winningUtrSides.has(side)),
  };
  const previous = parts.at(-1);
  if (previous && previous.end === start && equivalentCompositePart(previous, kind, metadata)) {
    previous.end = end;
  } else {
    parts.push({ kind, start, end, metadata });
  }
}

export function createCompositeIntronRuns(
  introns: readonly CompositeGeneIntronPart[],
): CompositeGeneIntronRun[] {
  const runs: CompositeGeneIntronRun[] = [];
  for (const intron of introns) {
    const previous = runs.at(-1);
    if (previous?.end === intron.start) previous.end = intron.end;
    else runs.push({ kind: "intron", start: intron.start, end: intron.end });
  }
  return runs;
}

function toMetadataContribution(part: CompositeContribution): CompositeGeneContribution {
  return { transcriptId: part.transcriptId, kind: part.kind, utrSide: part.utrSide };
}

function byOrder(left: CompositeContribution, right: CompositeContribution): number {
  return left.order - right.order;
}

function equivalentCompositePart(
  part: CompositeGenePart,
  kind: CompositeGenePart["kind"],
  metadata: CompositeGenePartMetadata,
): boolean {
  return (
    part.kind === kind &&
    sameContributions(part.metadata.winningContributions, metadata.winningContributions) &&
    sameContributions(part.metadata.overriddenContributions, metadata.overriddenContributions) &&
    sameValues(part.metadata.utrSides, metadata.utrSides)
  );
}

function sameContributions(
  left: readonly CompositeGeneContribution[],
  right: readonly CompositeGeneContribution[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (part, index) =>
        part.transcriptId === right[index]?.transcriptId &&
        part.kind === right[index]?.kind &&
        part.utrSide === right[index]?.utrSide,
    )
  );
}

function sameValues<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function addExonPart(
  parts: GeneExonPart[],
  kind: "cds",
  start: number,
  end: number,
  metadata: GeneExonPartBase["metadata"],
) {
  if (start < end) parts.push({ kind, start, end, metadata });
}

function addUtrPart(
  parts: GeneExonPart[],
  start: number,
  end: number,
  metadata: GeneExonPartBase["metadata"],
  side: GeneUtrSide,
) {
  if (start < end) parts.push({ kind: "utr", start, end, metadata: { ...metadata, side } });
}

function transcriptionIndex(
  index: number,
  count: number,
  strand: GeneTranscript["strand"],
): number {
  return strand === "+" ? index : count - index - 1;
}
