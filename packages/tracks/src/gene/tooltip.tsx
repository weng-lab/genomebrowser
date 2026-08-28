import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../shared/tooltips/trackTooltipFormatters";
import type {
  GeneInteractionTarget,
  GenePart,
  GeneTranscriptPart,
  MergedGenePart,
} from "./interactions";
import type { GeneConfig, GeneTranscript } from "./types";

export const GeneTooltip: TrackTooltipComponent<GeneInteractionTarget, GeneConfig> = ({ item }) => {
  const feature = item.feature;
  if (item.kind === "part") {
    const rows: TrackTooltipRow[] = [
      { label: "Part", value: partLabel(item.part) },
      {
        label: "Location",
        value: formatGenomicInterval(item.part.start, item.part.end, feature.chromosome),
      },
      { label: "Length", value: `${item.part.end - item.part.start} bp` },
    ];
    if (item.part.source === "transcript" && feature.kind === "transcript") {
      rows.push(
        ...transcriptPartRows(
          item.part,
          feature.transcriptName,
          feature.transcriptId,
          feature.exons.length,
        ),
      );
    } else if (item.part.source === "merged" && feature.kind === "gene") {
      rows.push(...mergedPartRows(item.part, feature.transcripts));
    }
    return <TrackTooltip title={feature.geneName || feature.geneId} rows={rows} />;
  }

  const rows: TrackTooltipRow[] = [
    {
      label: "Location",
      value: formatGenomicInterval(feature.start, feature.end, feature.chromosome),
    },
    { label: "Strand", value: feature.strand },
  ];
  if (feature.kind === "transcript") {
    rows.push(
      { label: "Transcript Name", value: feature.transcriptName },
      { label: "Transcript ID", value: feature.transcriptId },
    );
  } else {
    rows.push({ label: "Transcripts", value: String(feature.transcripts.length) });
  }
  return <TrackTooltip title={feature.geneName || feature.geneId} rows={rows} />;
};

function transcriptPartRows(
  part: GeneTranscriptPart,
  transcriptName: string,
  transcriptId: string,
  exonCount: number,
): TrackTooltipRow[] {
  const rows: TrackTooltipRow[] = [
    { label: "Transcript Name", value: transcriptName },
    { label: "Transcript ID", value: transcriptId },
  ];
  const index = part.metadata.transcriptionIndex + 1;
  rows.push({
    label: part.kind === "intron" ? "Intron" : "Exon",
    value: `${index} of ${part.kind === "intron" ? Math.max(0, exonCount - 1) : exonCount}`,
  });
  if (part.kind === "utr") {
    rows.push({ label: "UTR", value: part.metadata.side === "5-prime" ? "5′" : "3′" });
  } else if (part.kind === "cds") {
    rows.push({
      label: "Frame",
      value: part.metadata.frame < 0 ? "Not set" : String(part.metadata.frame),
    });
  }
  return rows;
}

function mergedPartRows(
  part: MergedGenePart,
  transcripts: readonly GeneTranscript[],
): TrackTooltipRow[] {
  const metadata =
    part.kind === "intron" ? part.segments.map((segment) => segment.metadata) : [part.metadata];
  const supportingTranscripts = uniqueValues(
    metadata.flatMap(({ winningContributions }) =>
      winningContributions.map(({ transcriptId }) => transcriptId),
    ),
  );
  const overriddenKinds = uniqueValues(
    metadata.flatMap(({ overriddenContributions }) =>
      overriddenContributions.map(({ kind }) => partLabel({ kind })),
    ),
  );
  const transcriptNames = new Map(
    transcripts.map((transcript) => [transcript.transcriptId, transcript.transcriptName]),
  );
  const rows: TrackTooltipRow[] = [
    {
      label: "Supporting Transcripts",
      value: compactList(
        supportingTranscripts.map(
          (transcriptId) => transcriptNames.get(transcriptId) ?? transcriptId,
        ),
      ),
    },
  ];
  if (part.kind === "utr" && part.metadata.utrSides.length > 0) {
    rows.push({
      label: "UTR",
      value: part.metadata.utrSides.map((side) => (side === "5-prime" ? "5′" : "3′")).join(", "),
    });
  }
  if (overriddenKinds.length > 0) {
    rows.push({ label: "Also called", value: overriddenKinds.join(", ") });
  }
  return rows;
}

function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function compactList(values: readonly string[]): string {
  if (values.length <= 3) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

function partLabel(part: Pick<GenePart, "kind">): string {
  switch (part.kind) {
    case "cds":
      return "CDS";
    case "utr":
      return "UTR";
    case "noncoding-exon":
      return "Noncoding exon";
    case "intron":
      return "Intron";
  }
}
