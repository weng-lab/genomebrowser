import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../shared/tooltips/trackTooltip";
import { formatSignalValue } from "../shared/tooltips/trackTooltipFormatters";
import type { CaveTooltipItem } from "./types";
import type { CaveConfig } from "./schema";
export const CaveTooltip: TrackTooltipComponent<CaveTooltipItem, CaveConfig> = ({
  item,
  context,
}) => {
  const rows: TrackTooltipRow[] = [
    { label: "hmC", value: formatSignalValue(item.top?.max), color: context.config.topColor },
    {
      label: "OXBS",
      value: formatSignalValue(item.bottom?.max),
      color: context.config.bottomColor,
    },
  ];
  return <TrackTooltip rows={rows} />;
};
