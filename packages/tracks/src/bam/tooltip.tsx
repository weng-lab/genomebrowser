import type { BamRecord } from "@weng-lab/genomic-reader";
import { TrackTooltip } from "../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../shared/tooltips/trackTooltipFormatters";
import type { BamCoverageBin, BamJunction, BamTooltipItem } from "./types";

const flags: [number, string][] = [
  [1, "paired"],
  [2, "proper pair"],
  [8, "mate unmapped"],
  [16, "reverse strand"],
  [32, "mate reverse"],
  [64, "first in pair"],
  [128, "second in pair"],
  [256, "secondary"],
  [512, "quality check failed"],
  [1024, "duplicate"],
  [2048, "supplementary"],
];

const depthFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function BamTooltip({ item }: { item: BamTooltipItem }) {
  if (!("kind" in item)) return <AlignmentTooltip item={item} />;
  if (item.kind === "coverage") return <CoverageTooltip item={item} />;
  return <JunctionTooltip item={item} />;
}

function CoverageTooltip({ item }: { item: BamCoverageBin }) {
  const bases = item.end - item.start;
  const location = formatGenomicInterval(item.start, item.end, item.chromosome);
  if (bases === 1)
    return (
      <TrackTooltip
        title="Coverage"
        rows={[
          { label: "Location", value: location },
          { label: "Depth", value: `${item.max.toLocaleString()} alignments` },
        ]}
      />
    );
  return (
    <TrackTooltip
      title={`Coverage across ${bases.toLocaleString()} bases`}
      rows={[
        { label: "Location", value: location },
        { label: "Mean depth", value: depthFormatter.format(item.mean) },
        { label: "Max depth", value: item.max.toLocaleString() },
      ]}
    />
  );
}

function JunctionTooltip({ item }: { item: BamJunction }) {
  return (
    <TrackTooltip
      title="Splice junction"
      rows={[
        { label: "Intron", value: formatGenomicInterval(item.start, item.end, item.chromosome) },
        { label: "Span", value: `${(item.end - item.start).toLocaleString()} bp` },
        { label: "Support", value: `${item.support.toLocaleString()} alignments` },
      ]}
    />
  );
}

function AlignmentTooltip({ item }: { item: BamRecord }) {
  const knownQualities = item.phredQualities?.filter((quality) => quality !== 255);
  const meanQuality = knownQualities?.length
    ? (knownQualities.reduce((sum, value) => sum + value, 0) / knownQualities.length).toFixed(1)
    : "Unavailable";
  const cigar = item.cigar.map(({ op, length }) => `${length}${op}`).join("") || "Unavailable";
  const short = (value: string) => (value.length > 80 ? value.slice(0, 77) + "…" : value);
  return (
    <TrackTooltip
      title={item.readName}
      rows={[
        { label: "Location", value: formatGenomicInterval(item.start, item.end, item.chromosome) },
        { label: "Strand", value: item.strand === "+" ? "+ (forward)" : "- (reverse)" },
        {
          label: "MAPQ",
          value: item.mappingQuality === 255 ? "Unavailable" : String(item.mappingQuality),
        },
        { label: "Read length", value: `${item.sequence.length.toLocaleString()} bases` },
        { label: "Span", value: `${(item.end - item.start).toLocaleString()} bp` },
        { label: "CIGAR", value: short(cigar) },
        {
          label: "Flags",
          value: `${item.flags} (${
            flags
              .filter(([flag]) => item.flags & flag)
              .map(([, name]) => name)
              .join(", ") || "none"
          })`,
        },
        {
          label: "Mate",
          value: item.mate
            ? `${item.mate.chromosome}:${item.mate.start < 0 ? "unknown" : item.mate.start.toLocaleString()} (${item.mate.strand}${item.mate.unmapped ? ", unmapped" : ""})`
            : "Unavailable",
        },
        { label: "Template", value: String(item.templateLength) },
        { label: "Mean Phred", value: meanQuality },
        { label: "Sequence", value: short(item.sequence) || "Unavailable" },
      ].flatMap(({ label, value }) =>
        (value.match(/.{1,32}(?:\s|$)|.{1,32}/g) ?? [""]).map((line, index) => ({
          label: index === 0 ? label : "",
          value: line.trim(),
        })),
      )}
    />
  );
}
