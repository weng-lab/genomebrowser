import { ValuedPoint } from "../bigwig/types";
import { useTheme } from "../../../store/BrowserContext";

const COLORS = {
  cpg: "#20B2AA",
  chg: "#FF8C00",
  chh: "#FF1493",
  depth: "#696969",
};

export default function DefaultMethylCTooltip({ tooltipValues }: { tooltipValues: ValuedPoint[] }) {
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  const forwardData = {
    depth: tooltipValues[3]?.max || -1,
    cg: tooltipValues[0]?.max || -1,
    chg: tooltipValues[1]?.max || -1,
    chh: tooltipValues[2]?.max || -1,
  };

  const reverseData = {
    depth: tooltipValues[7]?.max || -1,
    cg: tooltipValues[4]?.max || -1,
    chg: tooltipValues[5]?.max || -1,
    chh: tooltipValues[6]?.max || -1,
  };

  const rowHeight = 20;
  const labelWidth = 50;
  const valueWidth = 44;
  const totalWidth = labelWidth + valueWidth;

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect rx={4} y={-4} width={totalWidth + 10} height={rowHeight * 10 + 15} fill={background} strokeWidth={1} />

      <g>
        {/* Forward section header */}
        <text x={5} y={12} fill={text} fontSize="14" fontWeight="bold">
          Forward
        </text>

        {/* Forward Depth */}
        <rect x={5} y={rowHeight + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.depth} />
        <text x={9} y={rowHeight + 15} fill="white" fontSize="12">
          Depth
        </text>
        <text x={labelWidth + 10} y={rowHeight + 15} fill={text} fontSize="12">
          {forwardData.depth === -1 ? "N/A" : Math.round(forwardData.depth)}
        </text>

        {/* Forward CG */}
        <rect x={5} y={rowHeight * 2 + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.cpg} />
        <text x={9} y={rowHeight * 2 + 15} fill="white" fontSize="12">
          CG
        </text>
        <text x={labelWidth + 10} y={rowHeight * 2 + 15} fill={text} fontSize="12">
          {forwardData.cg === -1 ? "N/A" : forwardData.cg.toFixed(2)}
        </text>

        {/* Forward CHG */}
        <rect x={5} y={rowHeight * 3 + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.chg} />
        <text x={9} y={rowHeight * 3 + 15} fill="white" fontSize="12">
          CHG
        </text>
        <text x={labelWidth + 10} y={rowHeight * 3 + 15} fill={text} fontSize="12">
          {forwardData.chg === -1 ? "N/A" : forwardData.chg.toFixed(2)}
        </text>

        {/* Forward CHH */}
        <rect x={5} y={rowHeight * 4 + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.chh} />
        <text x={9} y={rowHeight * 4 + 15} fill="white" fontSize="12">
          CHH
        </text>
        <text x={labelWidth + 10} y={rowHeight * 4 + 15} fill={text} fontSize="12">
          {forwardData.chh === -1 ? "N/A" : forwardData.chh.toFixed(2)}
        </text>

        {/* Reverse section header */}
        <text x={5} y={rowHeight * 5 + 20} fill={text} fontSize="14" fontWeight="bold">
          Reverse
        </text>

        {/* Reverse Depth */}
        <rect x={5} y={rowHeight * 6 + 8} width={labelWidth} height={rowHeight - 2} fill={COLORS.depth} />
        <text x={9} y={rowHeight * 6 + 23} fill="white" fontSize="12">
          Depth
        </text>
        <text x={labelWidth + 10} y={rowHeight * 6 + 23} fill={text} fontSize="12">
          {reverseData.depth === -1 ? "N/A" : Math.round(reverseData.depth)}
        </text>

        {/* Reverse CG */}
        <rect x={5} y={rowHeight * 7 + 8} width={labelWidth} height={rowHeight - 2} fill={COLORS.cpg} />
        <text x={9} y={rowHeight * 7 + 23} fill="white" fontSize="12">
          CG
        </text>
        <text x={labelWidth + 10} y={rowHeight * 7 + 23} fill={text} fontSize="12">
          {reverseData.cg === -1 ? "N/A" : reverseData.cg.toFixed(2)}
        </text>

        {/* Reverse CHG */}
        <rect x={5} y={rowHeight * 8 + 8} width={labelWidth} height={rowHeight - 2} fill={COLORS.chg} />
        <text x={9} y={rowHeight * 8 + 23} fill="white" fontSize="12">
          CHG
        </text>
        <text x={labelWidth + 10} y={rowHeight * 8 + 23} fill={text} fontSize="12">
          {reverseData.chg === -1 ? "N/A" : reverseData.chg.toFixed(2)}
        </text>

        {/* Reverse CHH */}
        <rect x={5} y={rowHeight * 9 + 8} width={labelWidth} height={rowHeight - 2} fill={COLORS.chh} />
        <text x={9} y={rowHeight * 9 + 23} fill="white" fontSize="12">
          CHH
        </text>
        <text x={labelWidth + 10} y={rowHeight * 9 + 23} fill={text} fontSize="12">
          {reverseData.chh === -1 ? "N/A" : reverseData.chh.toFixed(2)}
        </text>
      </g>
    </g>
  );
}
