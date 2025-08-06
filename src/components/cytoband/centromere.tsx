import React from "react";
import { CentromereProps } from "./types";

function centromerePath(x: number, width: number, height: number, opening: boolean): string {
  return opening
    ? `M ${x} ${height * 0.1} L ${x + width} ${height / 2} L ${x} ${height * 0.9}`
    : `M ${x + width} ${height * 0.1} L ${x} ${height / 2} L ${x + width} ${height * 0.9}`;
}

const Centromere: React.FC<CentromereProps> = (props) => (
  <path d={centromerePath(props.x, props.width, props.height, props.opening)} fill={props.color} />
);
export default Centromere;
