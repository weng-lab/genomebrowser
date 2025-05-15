import { useEffect, useMemo } from "react";
import { groupFeatures } from "../../../utils/coordinates";
import { useXTransform } from "../../../hooks/useXTransform";
import { TrackDimensions } from "../types";
import { TranscriptConfig, TranscriptList, TranscriptRow } from "./types";
import ClipPath from "../../svg/clipPath";
import { mergeTranscripts, renderTranscript } from "./helper";
import { useTrackStore } from "../../../store/trackStore";

interface SquishTranscriptProps {
  id: string;
  data: TranscriptList[];
  dimensions: TrackDimensions;
  geneName: string;
  rowHeight: number;
  color: string;
}

export function bestFontSize(height: number): number {
  if (height / 6 < 10) return height < 10 ? height : 10;
  return height / 6;
}

export default function SquishTranscript({ id, data, geneName, rowHeight, dimensions, color }: SquishTranscriptProps) {
  const { totalWidth, sideWidth } = dimensions;
  const x = useXTransform(totalWidth);
  const fontSize = bestFontSize(rowHeight) * 1.25;

  const rendered: TranscriptRow[] = useMemo(
    () =>
      groupFeatures(data?.map((gene) => mergeTranscripts(gene, geneName)) || [], x, fontSize).map((group, i) => ({
        y: i * rowHeight,
        transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, totalWidth)),
      })),
    [data, rowHeight, totalWidth]
  );

  const height = useMemo(() => Math.max(rowHeight * rendered.length, 35), [rowHeight, rendered.length]);

  const editTrack = useTrackStore((state) => state.editTrack);
  useEffect(() => {
    console.log(height);
    editTrack<TranscriptConfig>(id, { height });
  }, [height]);

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth},0)`}>
      <rect width={totalWidth} height={height} fill="white" />
      <defs>
        <ClipPath id={id} width={totalWidth} height={rendered.length * rowHeight} />
      </defs>
      {rendered.map((group, k) => (
        <g
          style={{ clipPath: `url(#${id})` }}
          transform={`translate(0,${group.y})`}
          height={rowHeight}
          width={totalWidth}
          key={`row_${k}`}
        >
          {group.transcripts.map((transcript, j) => (
            <g key={`transcript_${j}`}>
              <path
                stroke={transcript.transcript.color || color}
                fill={transcript.transcript.color || color}
                strokeWidth={rowHeight / 16}
                d={transcript.paths.introns + transcript.paths.exons}
                // style={{ cursor: onTranscriptClick ? "pointer" : "default" }}
                // onMouseOver={(e: React.MouseEvent<SVGPathElement>) => mouseOver(e, transcript.transcript)}
                // onMouseOut={mouseOut}
                // onClick={() => props.onTranscriptClick && props.onTranscriptClick(transcript.transcript)}
              />
              <text
                fill={transcript.transcript.color || color}
                fontSize={fontSize}
                x={transcript.transcript.coordinates.end + 5}
                y={rowHeight / 2}
                dominantBaseline="middle"
                style={{
                  pointerEvents: "none",
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                  userSelect: "none",
                }}
              >
                {transcript.transcript.name}
              </text>
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}
