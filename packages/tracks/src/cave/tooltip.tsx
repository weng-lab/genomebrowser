import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../tooltips/trackTooltip";
import { formatSignalValue } from "../tooltips/trackTooltipFormatters";
import type { CaveConfig, CaveTooltipItem } from "./types";
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
