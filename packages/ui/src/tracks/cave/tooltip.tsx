import type { CaveConfig, CaveTooltipItem, TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../trackTooltip";
import { formatSignalValue } from "../trackTooltipFormatters";

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
