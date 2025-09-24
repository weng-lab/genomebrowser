import { useMemo } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";
import useInteraction from "../../../hooks/useInteraction";
import { isLead } from "../ldtrack/helpers";
import { ManhattanPoint, ManhattanProps } from "./types";
import { linearScale } from "../../../utils/coordinates";
import { useBrowserStore } from "../../../store/BrowserContext";

export default function Scatter({
  id,
  data,
  height,
  color,
  dimensions,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: ManhattanProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);
  const getDomain = useBrowserStore((state) => state.getExpandedDomain);

  const { x } = useXTransform(totalWidth);

  // const [hoveredSnp, setHoveredSnp] = useState<SNP | null>(null);

  // const { handleClick, handleHover, handleLeave } = useInteraction({
  //   onClick,
  //   onHover,
  //   onLeave,
  //   tooltip: tooltip || Tooltip,
  // });

  const transformedData = useMemo(() => {
    const domain = getDomain();
    console.log(data);
    const withinDomain = data.filter((snp: ManhattanPoint) => {
      return snp.chr === domain.chromosome && snp.start <= domain.end && snp.end >= domain.start;
    });

    console.log(withinDomain);
    return (
      withinDomain.map((snp: ManhattanPoint) => ({
        ...snp,
        pixelStart: x(snp.start),
        pixelEnd: x(snp.end),
      })) || []
    );
  }, [data, x, getDomain]);

  // // Calculate which SNPs should be highlighted based on hovered SNP
  // const highlightedSnpIds = useMemo(() => {
  //   if (!hoveredSnp) return new Set<string>();

  //   const highlighted = new Set<string>();
  //   highlighted.add(hoveredSnp.snpid); // Always highlight the hovered SNP

  //   if (isLead(hoveredSnp)) {
  //     // If hovered SNP is a lead SNP, highlight all SNPs that reference it
  //     transformedData.forEach((snp: SNP) => {
  //       if (!isLead(snp) && snp.ldblocksnpid !== "Lead") {
  //         const ldblocksnpids = snp.ldblocksnpid.split(",").map((id) => id.trim());
  //         if (ldblocksnpids.includes(hoveredSnp.snpid)) {
  //           highlighted.add(snp.snpid);
  //         }
  //       }
  //     });
  //   } else {
  //     // If hovered SNP is a non-lead SNP, highlight the lead SNPs it references
  //     if (hoveredSnp.ldblocksnpid !== "Lead") {
  //       const ldblocksnpids = hoveredSnp.ldblocksnpid.split(",").map((id) => id.trim());
  //       ldblocksnpids.forEach((leadSnpId) => {
  //         const leadSnp = transformedData.find((snp: SNP) => snp.snpid === leadSnpId);
  //         if (leadSnp && isLead(leadSnp)) {
  //           highlighted.add(leadSnp.snpid);
  //         }
  //       });
  //     }
  //   }

  //   return highlighted;
  // }, [hoveredSnp, transformedData]);

  const radius = 4; // Constant radius for visibility

  // const cutoffY = height - 0.7 * height; // Y position for 0.7 r² cutoff
  const yRange = useMemo(() => {
    const min = transformedData
      .map((point: ManhattanPoint) => point.p_value)
      .reduce((a: number, b: number) => Math.min(a, b), Infinity);
    const max = transformedData
      .map((point: ManhattanPoint) => point.p_value)
      .reduce((a: number, b: number) => Math.max(a, b), -Infinity);
    console.log(min, max);
    return {
      min,
      max,
    };
  }, [transformedData]);

  const cutoffY = useMemo(() => linearScale(0.00000005, yRange, { min: 0, max: height }), [yRange]);

  return (
    <g id={id} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />

      {/* Dashed line for 0.7 r² cutoff */}
      <line
        x1={0}
        y1={cutoffY}
        x2={totalWidth}
        y2={cutoffY}
        stroke={text}
        strokeWidth={1}
        strokeDasharray="3,3"
        opacity={0.6}
      />

      {transformedData.map(
        (snp: { pixelStart: number; pixelEnd: number; snpid: string } & ManhattanPoint, index: number) => {
          // const isLeadSnp = isLead(snp);

          // const rsquareValue = isLeadSnp ? 1.0 : parseFloat(snp.rsquare.split(",")[0]) || 0;

          // const yPosition = height - rsquareValue * height;
          const xPosition = (snp.pixelStart + snp.pixelEnd) / 2;
          const yPosition = linearScale(snp.p_value, yRange, { min: 0, max: height });

          // const isHighlighted = highlightedSnpIds.has(snp.snpid);
          // let opacity: number;
          // if (isHighlighted) {
          //   opacity = 1.0;
          // } else if (hoveredSnp) {
          //   opacity = 0.1;
          // } else {
          //   opacity = isLeadSnp ? 1.0 : 0.25;
          // }

          return (
            <circle
              key={`${snp.snpid}-${index}`}
              cx={xPosition}
              cy={yPosition}
              r={radius}
              fill={color}
              // opacity={opacity}
              // onClick={() => handleClick(snp)}
              // onMouseOver={(e) => {
              //   handleHover(snp, "", e);
              //   setHoveredSnp(snp);
              // }}
              // onMouseOut={() => {
              //   handleLeave(snp);
              //   setHoveredSnp(null);
              // }}
              style={{ cursor: onClick ? "pointer" : "default" }}
            />
          );
        }
      )}
    </g>
  );
}

// function Tooltip(snp: SNP) {
//   const text = useTheme((state) => state.text);
//   const background = useTheme((state) => state.background);

//   const isLeadSnp = snp.ldblocksnpid.split(",").includes(snp.snpid);
//   const rsquareValue = parseFloat(snp.rsquare.split(",")[0]) || 0;

//   return (
//     <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
//       <rect width={180} height={65} y={0} fill={background} />
//       <text fontSize={14} x={8} y={16}>
//         {snp.snpid}
//       </text>
//       <text fontSize={14} x={8} y={32}>
//         {snp.chromosome}:{snp.start}-{snp.stop}
//       </text>
//       <text fontSize={14} x={8} y={48}>
//         r² = {rsquareValue.toFixed(3)}
//       </text>
//       <text fontSize={14} x={8} y={62}>
//         {isLeadSnp ? "Lead SNP" : "Non-lead SNP"}
//       </text>
//     </g>
//   );
// }
