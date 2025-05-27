import { createElement, useMemo } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { bestFontSize } from "./squish";
import { PackTranscriptProps, Transcript, TranscriptRow } from "./types";
import { getRealTranscript, renderTranscript, sortedTranscripts } from "./helper";
import { groupFeatures } from "../../../utils/coordinates";
import ClipPath from "../../svg/clipPath";
import { useTheme } from "../../../store/themeStore";
import { useTooltipStore } from "../../../store/tooltipStore";
import { useRowHeight } from "../../../hooks/useRowHeight";
import DefaultTooltip from "../../tooltip/defaultTooltip";

export default function PackTranscript({
  id,
  data,
  height,
  dimensions,
  color,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: PackTranscriptProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rowHeight = useRowHeight(data.length, id);

  const fontSize = bestFontSize(rowHeight) * 1.25;
  const rendered: TranscriptRow[] = useMemo(
    () =>
      groupFeatures(sortedTranscripts(data || []), x, fontSize).map((group, i) => ({
        y: i * rowHeight,
        transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, totalWidth)),
      })),
    [data, rowHeight, totalWidth, x, fontSize]
  );

  const { background } = useTheme();

  const handleClick = (transcript: Transcript) => {
    const realTranscript = getRealTranscript(transcript, reverseX);
    if (onClick) {
      onClick(realTranscript);
    }
  };
  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const handleHover = (e: React.MouseEvent<SVGPathElement>, transcript: Transcript) => {
    const realTranscript = getRealTranscript(transcript, reverseX);
    if (onHover) {
      onHover(realTranscript);
    }
    let content = <DefaultTooltip value={realTranscript.name || ""} />;
    if (tooltip) {
      content = createElement(tooltip, realTranscript);
    }
    showTooltip(content, e.clientX, e.clientY);
  };
  const handleLeave = (transcript: Transcript) => {
    const realTranscript = getRealTranscript(transcript, reverseX);
    if (onLeave) {
      onLeave(realTranscript);
    }
    hideTooltip();
  };

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
          {group.transcripts.map((transcript, j) => (
            <g key={`transcript_${j}`}>
              <path
                stroke={transcript.transcript.color || color}
                fill={transcript.transcript.color || color}
                strokeWidth={rowHeight / 16}
                d={transcript.paths.introns + transcript.paths.exons}
                style={{ cursor: onClick ? "pointer" : "default" }}
                onClick={() => handleClick(transcript.transcript)}
                onMouseOver={(e: React.MouseEvent<SVGPathElement>) => handleHover(e, transcript.transcript)}
                onMouseOut={() => handleLeave(transcript.transcript)}
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
