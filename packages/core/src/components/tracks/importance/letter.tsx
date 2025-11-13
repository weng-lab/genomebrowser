import { createElement, useMemo } from "react";
import { ImportanceTrackDataPoint } from "./types";
import { A, C, G, T } from "logo-test";
import React from "react";

const COMPONENT_MAP = new Map([
  ["A", A],
  ["C", C],
  ["G", G],
  ["T", T],
]);

const COLOR_MAP = new Map([
  ["A", "#008800"],
  ["C", "#000088"],
  ["G", "#a89132"],
  ["T", "#880000"],
]);

export type LetterProps = ImportanceTrackDataPoint & {
  fill?: string;
  x: number;
  totalHeight: number;
  totalWidth: number;
  transform: (x: number) => [number, number, string];
  xScale: number;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
  onMouseUp?: () => void;
  onClick?: () => void;
};

const LetterComponent: React.FC<LetterProps> = (props) => {
  const [y, scale, s] = useMemo(() => props.transform(props.importance), [props.transform, props.importance]);
  return COMPONENT_MAP.get(props.base) ? (
    <>
      <rect
        fill="#000000"
        fillOpacity={0}
        y={0}
        x={props.x}
        width={props.totalWidth}
        height={props.totalHeight}
        onMouseOver={props.onMouseOver}
        onMouseOut={props.onMouseOut}
        onMouseDown={props.onClick}
        onMouseUp={props.onMouseUp}
      />
      <g transform={`${s} translate(${props.x},${y}) scale(${props.xScale},${scale})`}>
        {createElement(COMPONENT_MAP.get(props.base)! as React.ComponentType<{ fill?: string }>, {
          fill: COLOR_MAP.get(props.base),
        })}
      </g>
    </>
  ) : null;
};

export const Letter = React.memo(LetterComponent, (prevProps, nextProps) => {
  return (
    prevProps.base === nextProps.base &&
    prevProps.importance === nextProps.importance &&
    prevProps.x === nextProps.x &&
    prevProps.totalHeight === nextProps.totalHeight &&
    prevProps.totalWidth === nextProps.totalWidth &&
    prevProps.xScale === nextProps.xScale &&
    prevProps.transform === nextProps.transform &&
    prevProps.onMouseOver === nextProps.onMouseOver &&
    prevProps.onMouseOut === nextProps.onMouseOut &&
    prevProps.onMouseUp === nextProps.onMouseUp &&
    prevProps.onClick === nextProps.onClick
  );
});
