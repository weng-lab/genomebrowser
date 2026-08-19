import {
  useAutoTrackHeight,
  useInteraction,
  useTooltip,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";
import { createXScale } from "../shared/scale";
import {
  groupFeatures,
  isManeSelectTranscript,
  mergeTranscripts,
  renderTranscript,
  sortedTranscripts,
} from "./helpers";
import type { Transcript, TranscriptConfig, TranscriptData, TranscriptRow } from "./types";
const fontSize = 10;
export function SquishTranscript(props: TrackRendererProps<TranscriptConfig, TranscriptData>) {
  const transcripts = props.data
    .map(mergeTranscripts)
    .filter((transcript) => visible(transcript, props.region));
  return <Rows {...props} transcripts={transcripts} />;
}
export function PackTranscript(props: TrackRendererProps<TranscriptConfig, TranscriptData>) {
  return (
    <Rows
      {...props}
      transcripts={sortedTranscripts(props.data).filter((transcript) =>
        visible(transcript, props.region),
      )}
    />
  );
}
function Rows({
  id,
  config,
  color,
  region,
  width,
  height,
  transcripts,
}: TrackRendererProps<TranscriptConfig, TranscriptData> & { transcripts: Transcript[] }) {
  const x = createXScale(region, width);
  const grouped = groupFeatures(transcripts, x, fontSize);
  const rowHeight = useAutoTrackHeight(id, grouped.length);
  const rows: TranscriptRow[] = grouped.map((group, index) => ({
    y: index * rowHeight,
    transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, width)),
  }));
  const interaction = useInteraction<Transcript>();
  const tooltip = useTooltip<Transcript, TranscriptConfig>();
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) => (
        <g key={rowIndex} transform={`translate(0,${row.y})`}>
          {row.transcripts.map((rendered, index) => {
            const transcript = rendered.transcript;
            const fill = isManeSelectTranscript(transcript.tag)
              ? config.canonicalColor
              : config.geneName &&
                  transcript.name.toLowerCase().includes(config.geneName.toLowerCase())
                ? config.highlightColor
                : transcript.color || color;
            return (
              <g key={`${transcript.id}-${index}`}>
                <path
                  stroke={fill}
                  fill={fill}
                  strokeWidth={Math.max(0.5, rowHeight / 16)}
                  d={rendered.paths.introns + rendered.paths.exons}
                  style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
                  onClick={() => interaction?.onClick?.(transcript)}
                  onMouseEnter={(event) => {
                    interaction?.onHover?.(transcript);
                    tooltip.show(transcript, event);
                  }}
                  onMouseLeave={() => {
                    interaction?.onLeave?.(transcript);
                    tooltip.hide();
                  }}
                />
                <text
                  fill={fill}
                  fontSize={fontSize}
                  x={transcript.coordinates.end + 5}
                  y={rowHeight / 2}
                  dominantBaseline="middle"
                  pointerEvents="none"
                  style={{ userSelect: "none" }}
                >
                  {transcript.name}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}
function visible(transcript: Transcript, region: { start: number; end: number }) {
  return transcript.coordinates.end >= region.start && transcript.coordinates.start <= region.end;
}
