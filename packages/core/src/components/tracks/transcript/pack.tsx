import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useRowHeight } from "../../../hooks/useRowHeight";
import { useXTransform } from "../../../hooks/useXTransform";
// import { useTheme } from "../../../store/BrowserContext";
import { groupFeatures } from "../../../utils/coordinates";
import ClipPath from "../../svg/clipPath";
import { getRealTranscript, renderTranscript, sortedTranscripts } from "./helper";
import { PackTranscriptProps, TranscriptRow } from "./types";

export default function PackTranscript({
  id,
  data,
  geneName,
  height,
  dimensions,
  color,
  canonicalName,
  canonicalColor,
  highlightColor,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: PackTranscriptProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);
  const fontSize = 10;

  const sorted = useMemo(() => sortedTranscripts(data || []), [data]);
  const grouped = useMemo(() => groupFeatures(sorted, x, fontSize), [sorted, x, fontSize]);
  const rowHeight = useRowHeight(grouped.length, id);

  const rendered: TranscriptRow[] = useMemo(
    () =>
      grouped.map((group, i) => ({
        y: i * rowHeight,
        transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, totalWidth)),
      })),
    [grouped, rowHeight, totalWidth, x]
  );

  // const background = useTheme((state) => state.background);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth},0)`}>
      {/*<rect width={totalWidth} height={height} fill={background} />*/}
      <defs>
        <ClipPath id={id} width={totalWidth} height={grouped.length * rowHeight} />
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
            console.log(transcript);
            let fillColor;
            if (canonicalName?.toLowerCase().includes(transcript.transcript.name.toLowerCase())) {
              fillColor = canonicalColor;
            } else if (geneName !== "" && transcript.transcript.name.toLowerCase().includes(geneName?.toLowerCase())) {
              fillColor = highlightColor;
            }
            return (
              <g key={`transcript_${j}`}>
                <path
                  stroke={fillColor || color}
                  fill={fillColor || color}
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
                  fill={fillColor || color}
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
