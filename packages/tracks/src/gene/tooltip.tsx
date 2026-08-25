import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../shared/tooltips/trackTooltip";
import { formatGenomicInterval } from "../shared/tooltips/trackTooltipFormatters";
import type { GeneConfig, GeneFeature } from "./types";

export const GeneTooltip: TrackTooltipComponent<GeneFeature, GeneConfig> = ({ item }) => {
  const rows: TrackTooltipRow[] = [
    {
      label: "Location",
      value: formatGenomicInterval(item.start, item.end, item.chromosome),
    },
    { label: "Strand", value: item.strand },
  ];
  if (item.kind === "transcript") {
    rows.push({ label: "Transcript", value: item.transcriptId });
  } else {
    rows.push({ label: "Transcripts", value: String(item.transcripts.length) });
  }
  return <TrackTooltip title={item.geneName || item.geneId} rows={rows} />;
};
