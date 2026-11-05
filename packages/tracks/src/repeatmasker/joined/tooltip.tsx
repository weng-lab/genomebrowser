import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../../shared/tooltips/trackTooltipFormatters";
import { repeatColor } from "./presentation";
import type { BigRmskConfig } from "./schema";
import type { BigRmskRepeat } from "./types";

export function BigRmskTooltip({
  item,
}: {
  item: BigRmskRepeat;
  context: TrackRuntimeContext<BigRmskConfig>;
}) {
  return (
    <TrackTooltip
      title={item.repeatName}
      titleColor={repeatColor(item)}
      rows={[
        { label: "Class", value: item.repeatClass },
        ...(item.repeatFamily ? [{ label: "Family", value: item.repeatFamily }] : []),
        {
          label: "Aligned region",
          value: formatGenomicInterval(item.thickStart, item.thickEnd, item.chromosome),
        },
        { label: "Strand", value: item.strand },
        { label: "Divergence", value: `${item.score / 10}%` },
        { label: "Fragments", value: String(item.alignedBlocks.length) },
        { label: "Repeat ID", value: String(item.id) },
      ]}
    />
  );
}
