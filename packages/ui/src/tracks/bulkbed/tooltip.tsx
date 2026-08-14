import type { BulkBedConfig, BulkBedRect, TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../trackTooltip";
import { formatGenomicInterval, formatOptionalBedValue } from "../trackTooltipFormatters";

export const BulkBedTooltip: TrackTooltipComponent<BulkBedRect, BulkBedConfig> = ({
  item,
  context,
}) => {
  const configuredDataset =
    context.config.datasets.length === 1 ? context.config.datasets[0]?.name : undefined;
  const title = item.datasetName?.trim() || configuredDataset?.trim() || context.base.title;
  const featureName = formatOptionalBedValue(item.name);
  const chromosome = formatOptionalBedValue(item.chromosome);
  const strand = formatOptionalBedValue(item.strand);
  const score = formatOptionalBedValue(item.score);
  const rows: TrackTooltipRow[] = [];

  if (featureName) rows.push({ label: "Feature", value: featureName });
  rows.push({
    label: "Location",
    value: formatGenomicInterval(item.start, item.end, chromosome),
  });
  if (strand) rows.push({ label: "Strand", value: strand });
  if (score) rows.push({ label: "Score", value: score });

  return <TrackTooltip title={title} rows={rows} />;
};
