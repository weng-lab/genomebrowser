import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../tooltips/trackTooltip";
import { formatSignalValue } from "../tooltips/trackTooltipFormatters";
import type { BigWigConfig, RenderedBigWigPoint } from "./types";
export const BigWigTooltip: TrackTooltipComponent<RenderedBigWigPoint, BigWigConfig> = ({
  item,
}) => <TrackTooltip rows={[{ label: "Signal", value: formatSignalValue(item.max) }]} />;
