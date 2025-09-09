import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/BrowserContext";
import { useTheme } from "../../../store/themeStore";
import { LDProps } from "./types";
import useInteraction from "../../../hooks/useInteraction";

type SNP = {
  chromosome: string;
  ldblock: number;
  ldblocksnpid: string;
  pixelEnd: number;
  pixelStart: number;
  rsquare: string;
  snpid: string;
  start: number;
  stop: number;
};

export default function LD({ id, data, height, color, dimensions, onClick, onHover, onLeave, tooltip }: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const padding = 4;
  const delta = useBrowserStore((state) => state.delta);
  const update = delta === 0;
  const getDomain = useBrowserStore((state) => state.getExpandedDomain);

  const processedData = useMemo(() => {
    const domain = getDomain();
    const withinDomain = data?.filter((snp: SNP) => {
      const pastStart = snp.start >= domain.start;
      const behindEnd = snp.stop <= domain.end;
      const sameDomain = snp.chromosome === domain.chromosome;
      return pastStart && behindEnd && sameDomain;
    });
    return (
      withinDomain?.map((snp: SNP) => ({
        ...snp,
        pixelStart: ((snp.start - domain.start) * totalWidth) / (domain.end - domain.start),
        pixelEnd: ((snp.stop - domain.start) * totalWidth) / (domain.end - domain.start),
      })) || []
    );
  }, [data, update]);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip: tooltip || Tooltip,
  });

  // Function to create arc path between two points
  const createArcPath = (x1: number, x2: number, y: number, arcHeight: number = 30) => {
    // Position control point at 1/8 of the distance from x1 to x2
    const controlX = x1 + (x2 - x1) * 0.5;
    const controlY = y - arcHeight;
    return `M ${x1} ${y} Q ${controlX} ${controlY} ${x2} ${y}`;
  };

  // Function to scale SNP score to stroke width
  const getStrokeWidthFromScore = (score: string | number): number => {
    const numScore = typeof score === "string" ? parseFloat(score) : score;

    // Handle invalid scores
    if (isNaN(numScore)) return 1;

    // Scale from 0.7-1.0 range to 1-6 stroke width range
    const minScore = 0.7;
    const maxScore = 1.0;
    const minStroke = 1;
    const maxStroke = 6;

    // Clamp the score to the expected range
    const clampedScore = Math.max(minScore, Math.min(maxScore, numScore));

    // Linear scaling
    const normalizedScore = (clampedScore - minScore) / (maxScore - minScore);
    return Math.round(minStroke + normalizedScore * (maxStroke - minStroke));
  };

  const [hovered, setHovered] = useState<any>(null);
  const [referencedSNPs, setReferencedSNPs] = useState<SNP[]>([]);
  const [referencingSNPs, setReferencingSNPs] = useState<SNP[]>([]);

  useEffect(() => {
    if (!hovered) {
      setReferencedSNPs([]);
      setReferencingSNPs([]);
      return;
    }

    // Find the SNP that this hovered SNP references
    if (hovered.ldblocksnpid !== "Lead") {
      const referencedSnp = processedData.find((snp: SNP) => snp.snpid === hovered.ldblocksnpid);
      setReferencedSNPs(referencedSnp ? [referencedSnp] : []);
    } else {
      setReferencedSNPs([]);
    }

    // Find all SNPs that reference this hovered SNP
    const snpsReferencingHovered = processedData.filter(
      (snp: SNP) => snp.ldblocksnpid === hovered.snpid && snp.snpid !== hovered.snpid
    );
    setReferencingSNPs(snpsReferencingHovered);
  }, [hovered, processedData]);

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />

      {/* Draw arcs from hovered SNP to SNPs it references */}
      {hovered &&
        referencedSNPs.map((referencedSnp, index) => (
          <path
            key={`reference-arc-${index}`}
            d={createArcPath(
              hovered.pixelStart + (hovered.pixelEnd - hovered.pixelStart) / 2,
              referencedSnp.pixelStart + (referencedSnp.pixelEnd - referencedSnp.pixelStart) / 2,
              height / 2,
              40
            )}
            stroke={color}
            strokeWidth={getStrokeWidthFromScore(referencedSnp.rsquare)}
            fill="none"
            strokeDasharray="5,5"
          />
        ))}

      {/* Draw arcs from SNPs that reference the hovered SNP */}
      {hovered &&
        referencingSNPs.map((referencingSnp, index) => (
          <path
            key={`referencing-arc-${index}`}
            d={createArcPath(
              referencingSnp.pixelStart + (referencingSnp.pixelEnd - referencingSnp.pixelStart) / 2,
              hovered.pixelStart + (hovered.pixelEnd - hovered.pixelStart) / 2,
              height / 2,
              30
            )}
            stroke={color}
            strokeWidth={getStrokeWidthFromScore(referencingSnp.rsquare)}
            fill="none"
            opacity={0.7}
          />
        ))}
      <g transform={`translate(0, ${height / 2})`}>
        {processedData.map((snp: SNP, i: number) => {
          // Determine if this SNP should be highlighted
          const isHovered = hovered && snp.snpid === hovered.snpid;
          const isReferenced = referencedSNPs.some((ref) => ref.snpid === snp.snpid);
          const isReferencing = referencingSNPs.some((ref) => ref.snpid === snp.snpid);

          let fillColor = color;
          let opacity = 1;

          if (hovered) {
            if (isHovered) {
              fillColor = "#ff6b6b"; // Red for hovered SNP
            } else if (isReferenced) {
              fillColor = "#4ecdc4"; // Teal for referenced SNPs
              opacity = 0.8;
            } else if (isReferencing) {
              fillColor = "#45b7d1"; // Blue for referencing SNPs
              opacity = 0.8;
            } else {
              opacity = 0.3; // Fade out unrelated SNPs
            }
          }

          return (
            <rect
              key={`${id}_${i}`}
              height={height / 2}
              width={snp.pixelEnd - snp.pixelStart + padding}
              x={snp.pixelStart - padding / 2}
              y={0}
              fill={fillColor}
              opacity={opacity}
              stroke={isHovered ? "#333" : "none"}
              strokeWidth={isHovered ? 2 : 0}
              onClick={() => handleClick(snp)}
              onMouseOver={(e) => {
                handleHover(snp, "", e);
                setHovered(snp);
              }}
              onMouseOut={() => {
                handleLeave(snp);
                setHovered(null);
              }}
            />
          );
        })}
      </g>
    </g>
  );
}

function Tooltip(snp: SNP) {
  return (
    <g>
      <rect width={150} height={38} y={0} fill="white" stroke="black" strokeWidth={1} />
      <text fontSize={12} x={5} y={12}>
        {snp.snpid}
      </text>
      <text fontSize={12} x={5} y={24}>
        {snp.chromosome}:{snp.start}-{snp.stop}
      </text>
      <text fontSize={12} x={5} y={36}>
        {snp.rsquare === "*" ? "Lead" : snp.rsquare}
      </text>
    </g>
  );
}
