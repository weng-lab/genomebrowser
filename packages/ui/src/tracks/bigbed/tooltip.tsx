import type { BigBedConfig, BigBedRow, TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../trackTooltip";
import { formatGenomicInterval, formatOptionalBedValue } from "../trackTooltipFormatters";

export const BigBedTooltip: TrackTooltipComponent<BigBedRow, BigBedConfig> = ({ item }) => {
  const chromosome = formatOptionalBedValue(item.chromosome);
  const location = formatGenomicInterval(item.start, item.end, chromosome);
  const strand = formatOptionalBedValue(item.strand);
  const score = formatOptionalBedValue(item.score);
  const rows = [
    { label: "Location", value: location },
    ...(strand ? [{ label: "Strand", value: strand }] : []),
    ...(score ? [{ label: "Score", value: score }] : []),
  ];

  return <TrackTooltip title={formatOptionalBedValue(item.name)} rows={rows} />;
};
