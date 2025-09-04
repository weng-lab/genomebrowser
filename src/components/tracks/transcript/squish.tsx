import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useRowHeight } from "../../../hooks/useRowHeight";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/BrowserContext";
import { groupFeatures } from "../../../utils/coordinates";
import ClipPath from "../../svg/clipPath";
import { getRealTranscript, mergeTranscripts, renderTranscript } from "./helper";
import { SquishTranscriptProps, TranscriptRow } from "./types";

export function bestFontSize(height: number): number {
  if (height / 6 < 10) return height < 10 ? height : 10;
  return height / 6;
}

export default function SquishTranscript({
  id,
  data,
  geneName,
  height,
  dimensions,
  color,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: SquishTranscriptProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);
  const fontSize = 12;

  const grouped = useMemo(
    () => groupFeatures(data?.map((gene) => mergeTranscripts(gene, geneName)) || [], x, fontSize),
    [data, x, geneName]
  );

  const rowHeight = useRowHeight(grouped.length, id);

  const rendered: TranscriptRow[] = useMemo(
    () =>
      grouped.map((group, i) => ({
        y: i * rowHeight,
        transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, totalWidth)),
      })),
    [grouped, rowHeight, totalWidth, x, geneName]
  );

  const background = useTheme((state) => state.background);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth},0)`}>
      <rect width={totalWidth} height={height} fill={background} />
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
          {group.transcripts.map((transcript, j) => {
            const realTranscript = getRealTranscript(transcript.transcript, reverseX);
            return (
              <g key={`transcript_${j}`}>
                <path
                  stroke={transcript.transcript.color || color}
                  fill={transcript.transcript.color || color}
                  strokeWidth={rowHeight / 16}
                  d={transcript.paths.introns + transcript.paths.exons}
                  style={{ cursor: onClick ? "pointer" : "default" }}
                  onClick={() => handleClick(realTranscript)}
                  onMouseOver={(e: React.MouseEvent<SVGPathElement>) =>
                    handleHover(realTranscript, realTranscript.name || "", e)
                  }
                  onMouseOut={() => handleLeave(realTranscript)}
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
            );
          })}
        </g>
      ))}
    </g>
  );
}
