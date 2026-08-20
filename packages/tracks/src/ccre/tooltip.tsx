import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import type { BigBedConfig } from "../bigbed/types";
import { formatGenomicInterval } from "../shared/tooltips/trackTooltipFormatters";
import { TrackTooltip } from "../shared/tooltips/trackTooltip";
import type { CcreBigBedRow } from "./schema";

export function CcreBigBedTooltip({
  item,
}: {
  item: CcreBigBedRow;
  context: TrackRuntimeContext<BigBedConfig>;
}) {
  return (
    <TrackTooltip
      title={item.name}
      titleColor={item.color}
      rows={[
        { label: "Classification", value: item.ccreClass },
        {
          label: "Location",
          value: formatGenomicInterval(item.start, item.end, item.chromosome),
        },
      ]}
    />
  );
}
