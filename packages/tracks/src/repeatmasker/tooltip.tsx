import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import { StandardRepeatMaskerTooltip } from "./standard/tooltip";
import { BigRmskTooltip, BigRmskSummaryTooltip } from "./joined/tooltip";
import { standardConfig, joinedConfig, type RepeatMaskerConfig } from "./schema";
import type { RepeatMaskerItem } from "./types";

export function RepeatMaskerTooltip({
  item,
  context,
}: {
  item: RepeatMaskerItem;
  context: TrackRuntimeContext<RepeatMaskerConfig>;
}) {
  if ("kind" in item && item.kind === "joined-summary")
    return (
      <BigRmskSummaryTooltip
        item={item}
        context={{ ...context, config: joinedConfig(context.config) }}
      />
    );
  // Identify the hovered result itself, even if the view changed since hover began.
  return "alignedBlocks" in item ? (
    <BigRmskTooltip item={item} context={{ ...context, config: joinedConfig(context.config) }} />
  ) : (
    <StandardRepeatMaskerTooltip
      item={item}
      context={{ ...context, config: standardConfig(context.config) }}
    />
  );
}
