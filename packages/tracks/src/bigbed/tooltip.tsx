import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../tooltips/trackTooltip";
import { formatGenomicInterval, formatOptionalBedValue } from "../tooltips/trackTooltipFormatters";
import type { BigBedConfig, BigBedRow } from "./types";

export const BigBedTooltip: TrackTooltipComponent<BigBedRow, BigBedConfig> = ({ item }) => {
  const location = formatGenomicInterval(
    item.start,
    item.end,
    formatOptionalBedValue(item.chromosome),
  );
  const strand = formatOptionalBedValue(item.strand);
  const score = formatOptionalBedValue(item.score);
  return (
    <TrackTooltip
      title={formatOptionalBedValue(item.name)}
      rows={[
        { label: "Location", value: location },
        ...(strand ? [{ label: "Strand", value: strand }] : []),
        ...(score ? [{ label: "Score", value: score }] : []),
      ]}
    />
  );
};
