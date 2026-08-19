import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../tooltips/trackTooltip";
import { formatGenomicInterval } from "../tooltips/trackTooltipFormatters";
import type { Transcript, TranscriptConfig } from "./types";
export const TranscriptTooltip: TrackTooltipComponent<Transcript, TranscriptConfig> = ({
  item,
}) => {
  const title = item.name || item.id;
  const rows: TrackTooltipRow[] = [];
  if (item.id && item.id !== title) rows.push({ label: "ID", value: item.id });
  rows.push(
    {
      label: "Interval",
      value: formatGenomicInterval(item.coordinates.start, item.coordinates.end),
    },
    { label: "Strand", value: item.strand },
  );
  if (item.tag) rows.push({ label: "Tag", value: item.tag });
  return <TrackTooltip title={title} rows={rows} />;
};
