import { useAutoTrackHeight } from "../../src/hooks/useAutoTrackHeight";
import { useInteraction } from "../../src/hooks/useInteraction";
import type { TrackRendererProps } from "../../src/modules/types";
import { createXScale } from "../../src/utils/scale";
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
  config,
  region,
  width,
  height,
  transcripts,
}: TrackRendererProps<TranscriptConfig, TranscriptData> & { transcripts: Transcript[] }) {
  const x = createXScale(region, width);
  const grouped = groupFeatures(transcripts, x, FONT_SIZE);
  const rowHeight = useAutoTrackHeight(config.id, grouped.length);
  const rows: TranscriptRow[] = grouped.map((group, index) => ({
    y: index * rowHeight,
    transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, width)),
  }));
  const { handleClick, handleHover, handleLeave } = useInteraction<Transcript, TranscriptConfig>({
    config,
    fallback: (transcript) => transcript.name || transcript.id,
  });

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) => (
        <g key={rowIndex} transform={`translate(0,${row.y})`}>
          {row.transcripts.map((transcript, transcriptIndex) => {
            const fill = getTranscriptColor(config, transcript.transcript);
            return (
              <g key={`${transcript.transcript.id}-${transcriptIndex}`}>
                <path
                  stroke={fill}
                  fill={fill}
                  strokeWidth={Math.max(0.5, rowHeight / 16)}
                  d={transcript.paths.introns + transcript.paths.exons}
                  style={{ cursor: config.onClick ? "pointer" : "default" }}
                  onClick={(event) => handleClick(transcript.transcript, event)}
                  onMouseOver={(event) => handleHover(transcript.transcript, event)}
                  onMouseOut={(event) => handleLeave(transcript.transcript, event)}
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

function getTranscriptColor(config: TranscriptConfig, transcript: Transcript) {
  if (isManeSelectTranscript(transcript.tag))
    return config.canonicalColor ?? config.color ?? "#7a4fb3";
  if (config.geneName && transcript.name.toLowerCase().includes(config.geneName.toLowerCase())) {
    return config.highlightColor ?? config.color ?? "#7a4fb3";
  }
  return transcript.color || config.color || "#7a4fb3";
}

function isVisible(transcript: Transcript, region: { start: number; end: number }) {
  return transcript.coordinates.end >= region.start && transcript.coordinates.start <= region.end;
}
