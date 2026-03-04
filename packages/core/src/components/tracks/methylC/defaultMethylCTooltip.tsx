import { ValuedPoint } from "../bigwig/types";
import { useTheme } from "../../../store/BrowserContext";

const COLORS = {
  cpg: "#648bd8", // rgb(100, 139, 216)
  chg: "#ff944d", // rgb(255, 148, 77)
  chh: "#ff00ff", // rgb(25, 14, 25)
  depth: "#525252", // rgb(82, 82, 82)
};

export default function DefaultMethylCTooltip({ tooltipValues }: { tooltipValues: ValuedPoint[] }) {
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  const forwardData = {
    depth: tooltipValues[3]?.max,
    cg: tooltipValues[0]?.max,
    chg: tooltipValues[1]?.max,
    chh: tooltipValues[2]?.max,
  };

  const reverseData = {
    depth: tooltipValues[7]?.max,
    cg: tooltipValues[4]?.max,
    chg: tooltipValues[5]?.max,
    chh: tooltipValues[6]?.max,
  };

  const rowHeight = 20;
  const labelWidth = 105;
  const valueWidth = 44;
  const totalWidth = labelWidth + valueWidth;

  // Compute sequential row indices so hidden rows condense
  let fwdRow = 0;
  const fwdDepthRow = forwardData.depth != null ? ++fwdRow : -1;
  const fwdCgRow = forwardData.cg != null ? ++fwdRow : -1;
  const fwdChgRow = forwardData.chg != null ? ++fwdRow : -1;
  const fwdChhRow = forwardData.chh != null ? ++fwdRow : -1;

  // Reverse header sits after forward header + forward rows + gap
  const reverseHeaderY = rowHeight * (1 + fwdRow) + 20;

  let revRow = 0;
  const revDepthRow = reverseData.depth != null ? ++revRow : -1;
  const revCgRow = reverseData.cg != null ? ++revRow : -1;
  const revChgRow = reverseData.chg != null ? ++revRow : -1;
  const revChhRow = reverseData.chh != null ? ++revRow : -1;

  const revRowY = (row: number) => reverseHeaderY + rowHeight * (row - 1) + 8;

  const totalHeight = revRow > 0 ? revRowY(revRow) + rowHeight + 4 : reverseHeaderY + 20;

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect rx={4} y={-4} width={totalWidth + 10} height={totalHeight} fill={background} strokeWidth={1} />

      <g>
        {/* Forward section header */}
        <text x={5} y={12} fill={text} fontSize="14" fontWeight="bold">
          Forward
        </text>

        {/* Forward Depth */}
        {fwdDepthRow >= 0 && (
          <>
            <rect x={5} y={rowHeight * fwdDepthRow + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.depth} />
            <text x={9} y={rowHeight * fwdDepthRow + 15} fill="white" fontSize="12">
              Coverage for CpG
            </text>
            <text x={labelWidth + 10} y={rowHeight * fwdDepthRow + 15} fill={text} fontSize="12">
              {Math.round(forwardData.depth!)}
            </text>
          </>
        )}

        {/* Forward CG */}
        {fwdCgRow >= 0 && (
          <>
            <rect x={5} y={rowHeight * fwdCgRow + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.cpg} />
            <text x={9} y={rowHeight * fwdCgRow + 15} fill="white" fontSize="12">
              CG
            </text>
            <text x={labelWidth + 10} y={rowHeight * fwdCgRow + 15} fill={text} fontSize="12">
              {forwardData.cg!.toFixed(2) + "%"}
            </text>
          </>
        )}

        {/* Forward CHG */}
        {fwdChgRow >= 0 && (
          <>
            <rect x={5} y={rowHeight * fwdChgRow + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.chg} />
            <text x={9} y={rowHeight * fwdChgRow + 15} fill="white" fontSize="12">
              CHG
            </text>
            <text x={labelWidth + 10} y={rowHeight * fwdChgRow + 15} fill={text} fontSize="12">
              {forwardData.chg!.toFixed(2) + "%"}
            </text>
          </>
        )}

        {/* Forward CHH */}
        {fwdChhRow >= 0 && (
          <>
            <rect x={5} y={rowHeight * fwdChhRow + 2} width={labelWidth} height={rowHeight - 2} fill={COLORS.chh} />
            <text x={9} y={rowHeight * fwdChhRow + 15} fill="white" fontSize="12">
              CHH
            </text>
            <text x={labelWidth + 10} y={rowHeight * fwdChhRow + 15} fill={text} fontSize="12">
              {forwardData.chh!.toFixed(2) + "%"}
            </text>
          </>
        )}

        {/* Reverse section header */}
        <text x={5} y={reverseHeaderY} fill={text} fontSize="14" fontWeight="bold">
          Reverse
        </text>

        {/* Reverse Depth */}
        {revDepthRow >= 0 && (
          <>
            <rect x={5} y={revRowY(revDepthRow)} width={labelWidth} height={rowHeight - 2} fill={COLORS.depth} />
            <text x={9} y={revRowY(revDepthRow) + 15} fill="white" fontSize="12">
              Coverage for CpG
            </text>
            <text x={labelWidth + 10} y={revRowY(revDepthRow) + 15} fill={text} fontSize="12">
              {Math.round(reverseData.depth!)}
            </text>
          </>
        )}

        {/* Reverse CG */}
        {revCgRow >= 0 && (
          <>
            <rect x={5} y={revRowY(revCgRow)} width={labelWidth} height={rowHeight - 2} fill={COLORS.cpg} />
            <text x={9} y={revRowY(revCgRow) + 15} fill="white" fontSize="12">
              CG
            </text>
            <text x={labelWidth + 10} y={revRowY(revCgRow) + 15} fill={text} fontSize="12">
              {reverseData.cg!.toFixed(2) + "%"}
            </text>
          </>
        )}

        {/* Reverse CHG */}
        {revChgRow >= 0 && (
          <>
            <rect x={5} y={revRowY(revChgRow)} width={labelWidth} height={rowHeight - 2} fill={COLORS.chg} />
            <text x={9} y={revRowY(revChgRow) + 15} fill="white" fontSize="12">
              CHG
            </text>
            <text x={labelWidth + 10} y={revRowY(revChgRow) + 15} fill={text} fontSize="12">
              {reverseData.chg!.toFixed(2) + "%"}
            </text>
          </>
        )}

        {/* Reverse CHH */}
        {revChhRow >= 0 && (
          <>
            <rect x={5} y={revRowY(revChhRow)} width={labelWidth} height={rowHeight - 2} fill={COLORS.chh} />
            <text x={9} y={revRowY(revChhRow) + 15} fill="white" fontSize="12">
              CHH
            </text>
            <text x={labelWidth + 10} y={revRowY(revChhRow) + 15} fill={text} fontSize="12">
              {reverseData.chh!.toFixed(2) + "%"}
            </text>
          </>
        )}
      </g>
    </g>
  );
}
