import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import { TrackTooltip } from "../shared/tooltips/trackTooltip";
import {
  formatGenomicInterval,
  formatOptionalBedValue,
} from "../shared/tooltips/trackTooltipFormatters";
import type { BigBedConfig, BigBedRow } from "./types";

export function BigBedTooltip<
  Row extends BigBedRow = BigBedRow,
  Config extends BigBedConfig = BigBedConfig,
>({ item }: { item: Row; context: TrackRuntimeContext<Config> }) {
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
}
