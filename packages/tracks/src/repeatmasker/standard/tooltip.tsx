import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../../shared/tooltips/trackTooltipFormatters";
import type { StandardRepeatMaskerConfig } from "./schema";
import type { StandardRepeatMaskerItem } from "./types";
export function StandardRepeatMaskerTooltip({
  item,
}: {
  item: StandardRepeatMaskerItem;
  context: TrackRuntimeContext<StandardRepeatMaskerConfig>;
}) {
  const location = formatGenomicInterval(item.start, item.end, item.chromosome);
  if (item.kind === "summary")
    return (
      <TrackTooltip
        title="Repeat coverage summary"
        rows={[
          { label: "Region", value: location },
          { label: "Covered bases (estimated)", value: item.validCount.toFixed(2) },
          { label: "Mean overlap", value: item.mean.toFixed(2) },
          {
            label: "Details",
            value: "Use Full or Pack at a close zoom to inspect individual repeats",
          },
        ]}
      />
    );
  return (
    <TrackTooltip
      title={item.name}
      rows={[
        { label: "Class", value: item.repClass },
        { label: "Family", value: item.repFamily },
        { label: "Region", value: location },
        { label: "Strand", value: item.strand },
        { label: "SW score", value: String(item.swScore) },
        { label: "Divergence", value: `${item.milliDiv / 10}%` },
        { label: "Deletions", value: `${item.milliDel / 10}%` },
        { label: "Insertions", value: `${item.milliIns / 10}%` },
        {
          label: "Consensus",
          value: `start ${item.repStart}; end ${item.repEnd}; left ${item.repLeft}`,
        },
        { label: "Genome left", value: String(item.genoLeft) },
        { label: "Repeat ID", value: String(item.repeatId) },
      ]}
    />
  );
}
