import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../shared/tooltips/trackTooltip";
import { formatSignalValue } from "../shared/tooltips/trackTooltipFormatters";
import type { SignalPoint } from "../shared/signal";
import type { BigWigConfig } from "./types";
export const BigWigTooltip: TrackTooltipComponent<SignalPoint, BigWigConfig> = ({ item }) => (
  <TrackTooltip rows={[{ label: "Signal", value: formatSignalValue(item.max) }]} />
);
