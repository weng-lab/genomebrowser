import type { BamRecord } from "@weng-lab/genomic-reader";
import { TrackTooltip } from "../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../shared/tooltips/trackTooltipFormatters";

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

export function BamTooltip({ item }: { item: BamRecord }) {
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
