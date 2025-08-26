import { lighten } from "../../utils/color";
import { CytobandColors, CytobandProps } from "./types";

const COLOR_MAP: Map<string, (c: CytobandColors) => string> = new Map([
  ["stalk", (c: CytobandColors) => c.stalk],
  ["gvar", (c: CytobandColors) => c.default],
  ["gneg", (c: CytobandColors) => lighten(c.default, 0.9)],
]);

export default function Cytoband(props: CytobandProps) {
  const color =
    props.type.slice(0, 4) === "gpos"
      ? lighten(props.colors.default, 1.0 - +props.type.replace(/gpos/g, "") / 100.0)
      : COLOR_MAP.get(props.type)?.call(null, props.colors);
  return color === undefined ? null : (
    <rect
      width={props.width}
      height={props.height * 0.8}
      y={props.height * 0.1}
      x={props.x}
      fill={color}
      fillOpacity={props.opacity}
    />
  );
}
