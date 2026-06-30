import { useAutoTrackHeight } from "../../browser/track-row/useAutoTrackHeight";
import { useTooltip } from "../../browser/tooltip/useTooltip";
import { useInteraction } from "../../modules/interaction";
import type { TrackRendererProps } from "../../modules/types";
import { createXScale } from "../../modules/utils/scale";
import {
  groupFeatures,
  isManeSelectTranscript,
  mergeTranscripts,
  renderTranscript,
  sortedTranscripts,
} from "./helpers";
import type { Transcript, TranscriptConfig, TranscriptData, TranscriptRow } from "./types";

const FONT_SIZE = 10;

export function SquishTranscript(props: TrackRendererProps<TranscriptConfig, TranscriptData>) {
  const merged: Transcript[] = [];
  for (const gene of props.data) {
    const transcript = mergeTranscripts(gene);
    if (isVisible(transcript, props.region)) merged.push(transcript);
  }
  return <TranscriptRows {...props} transcripts={merged} />;
}

export function PackTranscript(props: TrackRendererProps<TranscriptConfig, TranscriptData>) {
  const transcripts = sortedTranscripts(props.data).filter((transcript) =>
    isVisible(transcript, props.region),
  );
  return <TranscriptRows {...props} transcripts={transcripts} />;
}

function TranscriptRows({
  id,
  config,
  color = "#7a4fb3",
  region,
  width,
  height,
  transcripts,
}: TrackRendererProps<TranscriptConfig, TranscriptData> & { transcripts: Transcript[] }) {
  const x = createXScale(region, width);
  const grouped = groupFeatures(transcripts, x, FONT_SIZE);
  const rowHeight = useAutoTrackHeight(id, grouped.length);
  const rows: TranscriptRow[] = grouped.map((group, index) => ({
    y: index * rowHeight,
    transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, width)),
  }));
  const interaction = useInteraction<Transcript>();
  const tooltip = useTooltip<Transcript, TranscriptConfig>({ type: "transcript", config });

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) => (
        <g key={rowIndex} transform={`translate(0,${row.y})`}>
          {row.transcripts.map((transcript, transcriptIndex) => {
            const fill = getTranscriptColor(config, transcript.transcript, color);
            return (
              <g key={`${transcript.transcript.id}-${transcriptIndex}`}>
                <path
                  stroke={fill}
                  fill={fill}
                  strokeWidth={Math.max(0.5, rowHeight / 16)}
                  d={transcript.paths.introns + transcript.paths.exons}
                  style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
                  onClick={() => interaction?.onClick?.(transcript.transcript)}
                  onMouseEnter={(event) => {
                    interaction?.onHover?.(transcript.transcript);
                    tooltip.show(transcript.transcript, event);
                  }}
                  onMouseLeave={() => {
                    interaction?.onLeave?.(transcript.transcript);
                    tooltip.hide();
                  }}
                />
                <text
                  fill={fill}
                  fontSize={FONT_SIZE}
                  x={transcript.transcript.coordinates.end + 5}
                  y={rowHeight / 2}
                  dominantBaseline="middle"
                  pointerEvents="none"
                  style={{ userSelect: "none" }}
                >
                  {transcript.transcript.name}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

function getTranscriptColor(config: TranscriptConfig, transcript: Transcript, color: string) {
  if (isManeSelectTranscript(transcript.tag)) return config.canonicalColor ?? color;
  if (config.geneName && transcript.name.toLowerCase().includes(config.geneName.toLowerCase())) {
    return config.highlightColor ?? color;
  }
  return transcript.color || color;
}

function isVisible(transcript: Transcript, region: { start: number; end: number }) {
  return transcript.coordinates.end >= region.start && transcript.coordinates.start <= region.end;
}
