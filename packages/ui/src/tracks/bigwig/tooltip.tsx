import type {
  BigWigConfig,
  RenderedBigWigPoint,
  TrackTooltipComponent,
} from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../trackTooltip";
import { formatSignalValue } from "../trackTooltipFormatters";

export const BigWigTooltip: TrackTooltipComponent<RenderedBigWigPoint, BigWigConfig> = ({
  item,
}) => {
  return <TrackTooltip rows={[{ label: "Signal", value: formatSignalValue(item.max) }]} />;
};
