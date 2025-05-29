import { Fragment, useCallback, useMemo, useState } from "react";
import { useRenderedImportanceTrackAnnotations, useRenderedImportanceTrackData } from "./helpers";
import { Letter } from "./letter";
import { ImportanceProps } from "./types";

export default function Importance({ data, annotations, dimensions, height, zeroLineProps }: ImportanceProps) {
  const { totalWidth: width, sideWidth } = dimensions;
  const [selection] = useState<[number, number] | null>(null);
  const [rendered, transform, rawTransform] = useRenderedImportanceTrackData(data, height);

  const renderedAnnotations = useRenderedImportanceTrackAnnotations(annotations || [], rendered, rawTransform);
  const letterScale = useMemo(() => width / rendered.length / 100, [width, rendered.length]);

  // Memoize the transform function to prevent unnecessary recalculations
  const memoizedTransform = useCallback(transform, [transform]);

  const annotationsElement = useMemo(() => {
    return renderedAnnotations.map((annotation, index) => {
      const width = 100 * letterScale * Math.abs(annotation.coordinates[1] - annotation.coordinates[0]);
      const x = Math.min(...annotation.coordinates) * letterScale * 100;
      const y = annotation.y + annotation.height;
      const toffset = 80;

      return (
        <Fragment key={index}>
          <rect
            fill={annotation.color}
            fillOpacity={0.4}
            x={x}
            width={width}
            height={annotation.height}
            y={annotation.y}
          />
          <path
            fill={annotation.color}
            fillOpacity={0.4}
            d={`M ${x} ${y} L ${x - width} ${y + toffset} L ${x - width} ${y + annotation.height * 3} L ${
              x + width * 2
            } ${y + annotation.height * 3} L ${x + width * 2} ${y + toffset} L ${x + width} ${y} L ${x} ${y}`}
          />
          <g transform={`translate(${x - width},${y + toffset})`}>{annotation.children}</g>
        </Fragment>
      );
    });
  }, [renderedAnnotations, letterScale]);

  const memoizedLettersProps = useMemo(
    () => ({
      totalWidth: letterScale * 100,
      totalHeight: height,
      xScale: letterScale,
      transform: memoizedTransform,
    }),
    [letterScale, height, memoizedTransform]
  );

  const lettersElement = useMemo(() => {
    return rendered.map((x, i) =>
      x.importance ? <Letter {...memoizedLettersProps} key={i} x={i * letterScale * 100} {...x} /> : null
    );
  }, [rendered, letterScale, height, memoizedTransform]);

  const zero = useMemo(() => transform(0)[0], [transform]);

  const zeroLineElement = useMemo(() => {
    return rendered.filter((x) => x.importance).length > 0 ? (
      <line stroke="#ff0000" strokeWidth={1} {...zeroLineProps} x1={0} x2={width} y1={zero} y2={zero} />
    ) : (
      <text x={0} y={height / 2}>
        No importance track data
      </text>
    );
  }, [rendered, width, zero, height, zeroLineProps]);

  return (
    <g width={width} height={height} transform={`translate(-${sideWidth}, 0)`}>
      {selection !== null && (
        <rect
          fill="#93ceed"
          fillOpacity={0.4}
          x={Math.min(...selection) * letterScale * 100}
          width={100 * letterScale * Math.abs(selection[1] - selection[0])}
          height={height}
        />
      )}
      {annotationsElement}
      {lettersElement}
      {zeroLineElement}
    </g>
  );
}
