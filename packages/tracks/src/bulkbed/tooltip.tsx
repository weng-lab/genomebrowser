import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../tooltips/trackTooltip";
import { formatGenomicInterval, formatOptionalBedValue } from "../tooltips/trackTooltipFormatters";
import type { BulkBedConfig, BulkBedRect } from "./types";

export const BulkBedTooltip: TrackTooltipComponent<BulkBedRect, BulkBedConfig> = ({
  item,
  context,
}) => {
  const title =
    item.datasetName?.trim() ||
    (context.config.datasets.length === 1 ? context.config.datasets[0]?.name.trim() : undefined) ||
    context.base.title;
  const featureName = formatOptionalBedValue(item.name);
  const strand = formatOptionalBedValue(item.strand);
  const score = formatOptionalBedValue(item.score);
  const rows: TrackTooltipRow[] = [];
  if (featureName) rows.push({ label: "Feature", value: featureName });
  rows.push({
    label: "Location",
    value: formatGenomicInterval(item.start, item.end, formatOptionalBedValue(item.chromosome)),
  });
  if (strand) rows.push({ label: "Strand", value: strand });
  if (score) rows.push({ label: "Score", value: score });
  return <TrackTooltip title={title} rows={rows} />;
};
