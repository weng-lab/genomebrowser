import { TrackTooltip } from "../shared/tooltips";
import { BigWigTooltip } from "../bigwig/tooltip";
import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import type { DynseqItem } from "./types";
import type { DynseqConfig } from "./schema";

export const DynseqTooltip: TrackTooltipComponent<DynseqItem, DynseqConfig> = ({
  item,
  context,
}) => {
  if (!("base" in item)) return <BigWigTooltip item={item} context={context} />;
  return (
    <TrackTooltip
      title={item.base.toUpperCase()}
      rows={[
        { label: "Position", value: (item.position + 1).toLocaleString("en-US") },
        { label: "Score", value: item.score.toFixed(4) },
      ]}
    />
  );
};
