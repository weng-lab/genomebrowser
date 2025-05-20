import { useTooltipStore } from "../../store/tooltipStore";

export default function Tooltip() {
  const { content, x, y, show } = useTooltipStore();
  if (!show) return null;
  return (  
    <g id="tooltip" transform={`translate(${x}, ${y})`}>
      {content}
    </g>
  );
}
