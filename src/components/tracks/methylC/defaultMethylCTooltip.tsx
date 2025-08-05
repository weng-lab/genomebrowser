import { ValuedPoint } from "../bigwig/types";

export default function DefaultMethylCTooltip({ tooltipValues }: { tooltipValues: ValuedPoint[] }) {
  return tooltipValues.map((v, index) => (
    <text key={index} y={20 * index} fill={"black"}>
      {v.max}
    </text>
  ));
}
