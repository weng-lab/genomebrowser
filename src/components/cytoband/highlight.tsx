import { CytobandHighlightProps, ShortHighlightProps } from "./types";

export default function CytobandHighlight(props: CytobandHighlightProps) {
  return props.x(props.highlight.end) - props.x(props.highlight.start) < 10 ? (
    <ShortHighlight highlight={props.highlight} x={props.x} height={props.height} />
  ) : (
    <rect
      x={props.x(props.highlight.start)}
      y={0}
      width={props.x(props.highlight.end) - props.x(props.highlight.start)}
      height={props.height}
      fill={props.highlight.color || "#ff000088"}
      onMouseOver={props.onMouseOver}
      onMouseOut={props.onMouseOut}
      onClick={props.onClick}
    />
  );
}

function ShortHighlight(props: ShortHighlightProps) {
  const { highlight, height, x } = props;
  const PATH1 = `M ${x(highlight.start) - 5} 0 L ${x(highlight.start)} ${height * 0.2} L ${x(highlight.start) + 5} 0`;
  const PATH2 = `M ${x(highlight.start) - 5} ${height} L ${x(highlight.start)} ${height * 0.8} L ${x(highlight.start) + 5} ${height}`;
  return (
    <>
      <path d={PATH1} stroke={highlight.color || "#ff0000"} strokeWidth={3} fill="none" />
      <path d={PATH2} stroke={highlight.color || "#ff0000"} strokeWidth={3} fill="none" />
    </>
  );
}
