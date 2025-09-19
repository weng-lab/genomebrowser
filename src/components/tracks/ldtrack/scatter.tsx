import { useMemo, useState } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";
import useInteraction from "../../../hooks/useInteraction";
import { LDProps, SNP } from "./types";
import { isLead } from "./helpers";

export default function Scatter({
  id,
  data,
  height,
  color,
  dimensions,
  show,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);

  const { x } = useXTransform(totalWidth);

  const [hoveredSnp, setHoveredSnp] = useState<SNP | null>(null);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip: tooltip || Tooltip,
  });

  const processedData = useMemo(() => {
    return (
      data.map((snp: SNP) => ({
        ...snp,
        pixelStart: x(snp.start),
        pixelEnd: x(snp.stop),
      })) || []
    );
  }, [data, x]);

  // Calculate which SNPs should be highlighted based on hovered SNP
  const highlightedSnpIds = useMemo(() => {
    if (!hoveredSnp) return new Set<string>();

    const highlighted = new Set<string>();
    highlighted.add(hoveredSnp.snpid); // Always highlight the hovered SNP

    if (isLead(hoveredSnp)) {
      // If hovered SNP is a lead SNP, highlight all SNPs that reference it
      processedData.forEach((snp) => {
        if (!isLead(snp) && snp.ldblocksnpid !== "Lead") {
          const ldblocksnpids = snp.ldblocksnpid.split(",").map((id) => id.trim());
          if (ldblocksnpids.includes(hoveredSnp.snpid)) {
            highlighted.add(snp.snpid);
          }
        }
      });
    } else {
      // If hovered SNP is a non-lead SNP, highlight the lead SNPs it references
      if (hoveredSnp.ldblocksnpid !== "Lead") {
        const ldblocksnpids = hoveredSnp.ldblocksnpid.split(",").map((id) => id.trim());
        ldblocksnpids.forEach((leadSnpId) => {
          const leadSnp = processedData.find((snp) => snp.snpid === leadSnpId);
          if (leadSnp && isLead(leadSnp)) {
            highlighted.add(leadSnp.snpid);
          }
        });
      }
    }

    return highlighted;
  }, [hoveredSnp, processedData]);

  const radius = 4; // Constant radius for visibility

  const cutoffY = height - 0.7 * height; // Y position for 0.7 r² cutoff

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

      {processedData.map((snp: SNP, index: number) => {
        const isLeadSnp = isLead(snp);

        const rsquareValue = isLeadSnp ? 1.0 : parseFloat(snp.rsquare.split(",")[0]) || 0;

        const yPosition = height - rsquareValue * height;
        const xPosition = (snp.pixelStart + snp.pixelEnd) / 2;

        const isHighlighted = highlightedSnpIds.has(snp.snpid);
        let opacity: number;
        if (isHighlighted) {
          opacity = 1.0;
        } else if (hoveredSnp) {
          opacity = 0.1;
        } else {
          opacity = isLeadSnp ? 1.0 : 0.25;
        }

        return (
          <circle
            key={`${snp.snpid}-${index}`}
            cx={xPosition}
            cy={yPosition}
            r={radius}
            fill={color}
            opacity={opacity}
            onClick={() => handleClick(snp)}
            onMouseOver={(e) => {
              handleHover(snp, "", e);
              setHoveredSnp(snp);
            }}
            onMouseOut={() => {
              handleLeave(snp);
              setHoveredSnp(null);
            }}
            style={{ cursor: onClick ? "pointer" : "default" }}
          />
        );
      })}
    </g>
  );
}

function Tooltip(snp: SNP) {
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  const isLeadSnp = snp.ldblocksnpid.split(",").includes(snp.snpid);
  const rsquareValue = parseFloat(snp.rsquare.split(",")[0]) || 0;

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect width={180} height={65} y={0} fill={background} />
      <text fontSize={14} x={8} y={16}>
        {snp.snpid}
      </text>
      <text fontSize={14} x={8} y={32}>
        {snp.chromosome}:{snp.start}-{snp.stop}
      </text>
      <text fontSize={14} x={8} y={48}>
        r² = {rsquareValue.toFixed(3)}
      </text>
      <text fontSize={14} x={8} y={62}>
        {isLeadSnp ? "Lead SNP" : "Non-lead SNP"}
      </text>
    </g>
  );
}
