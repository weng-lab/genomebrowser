import { createElement, useMemo } from "react";
import { groupFeatures } from "../../../utils/coordinates";
import { useXTransform } from "../../../hooks/useXTransform";
import { SquishTranscriptProps, Transcript, TranscriptRow } from "./types";
import ClipPath from "../../svg/clipPath";
import { getRealTranscript, mergeTranscripts, renderTranscript } from "./helper";
import { useTheme } from "../../../store/themeStore";
import { useTooltipStore } from "../../../store/tooltipStore";
import { useRowHeight } from "../../../hooks/useRowHeight";
import DefaultTooltip from "../../tooltip/defaultTooltip";

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

  const rowHeight = useRowHeight(data.length, id);

  const fontSize = bestFontSize(rowHeight) * 1.25;

  const rendered: TranscriptRow[] = useMemo(
    () =>
      groupFeatures(data?.map((gene) => mergeTranscripts(gene, geneName)) || [], x, fontSize).map((group, i) => ({
        y: i * rowHeight,
        transcripts: group.map((transcript) => renderTranscript(transcript, x, rowHeight, totalWidth)),
      })),
    [data, rowHeight, totalWidth, x, fontSize, geneName]
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
  const handleMouseOver = (e: React.MouseEvent<SVGPathElement>, transcript: Transcript) => {
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

  const handleMouseOut = (transcript: Transcript) => {
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
                onMouseOver={(e: React.MouseEvent<SVGPathElement>) => handleMouseOver(e, transcript.transcript)}
                onMouseOut={() => handleMouseOut(transcript.transcript)}
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
