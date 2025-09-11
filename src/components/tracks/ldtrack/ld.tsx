import { useEffect, useMemo, useState } from "react";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import { useTheme } from "../../../store/themeStore";
import { LDProps } from "./types";
import useInteraction from "../../../hooks/useInteraction";
import { linearScale } from "../../../utils/coordinates";
import { darken, isDark, lighten } from "../../../utils/color";

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
  sourceSnp?: string; // Added for tracking which SNP this connection comes from
};

export default function LD({ id, data, height, color, dimensions, show, onClick, onHover, onLeave, tooltip }: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);
  const padding = 4;
  const delta = useBrowserStore((state) => state.delta);
  const update = delta === 0;
  const getDomain = useBrowserStore((state) => state.getExpandedDomain);
  const editTrack = useTrackStore((state) => state.editTrack);
  // must add to height
  const snpHeight = height / 3;
  const leadHeight = (2 * height) / 3;

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

  const [hovered, setHovered] = useState<SNP | null>(null);
  const [referencedSNPs, setReferencedSNPs] = useState<SNP[]>([]);
  const [referencingSNPs, setReferencingSNPs] = useState<SNP[]>([]);

  // Calculate SNPs that should show arcs (from show list + hovered)
  const snpsToShowArcs = useMemo(() => {
    const showList = show || [];
    const snpsFromShow = processedData.filter((snp) => showList.includes(snp.snpid));
    const snpsToShow = hovered ? [...snpsFromShow, hovered] : snpsFromShow;
    // Remove duplicates
    return snpsToShow.filter((snp, index, self) => index === self.findIndex((s) => s.snpid === snp.snpid));
  }, [show, processedData, hovered]);

  useEffect(() => {
    // Calculate referenced and referencing SNPs for all SNPs that should show arcs
    const allReferencedSNPs: SNP[] = [];
    const allReferencingSNPs: SNP[] = [];

    snpsToShowArcs.forEach((snp) => {
      // Add referenced SNPs (SNPs that this SNP references)
      if (snp.ldblocksnpid !== "Lead") {
        const referencedSnp = processedData.find((s: SNP) => s.snpid === snp.ldblocksnpid);
        if (referencedSnp) {
          // Check if this exact connection already exists (same source and target)
          const existingConnection = allReferencedSNPs.find(
            (s) => s.snpid === referencedSnp.snpid && s.sourceSnp === snp.snpid
          );
          if (!existingConnection) {
            allReferencedSNPs.push({ ...referencedSnp, sourceSnp: snp.snpid });
          }
        }
      }

      // Add referencing SNPs (SNPs that reference this SNP)
      const snpsReferencingThis = processedData.filter(
        (s: SNP) => s.ldblocksnpid === snp.snpid && s.snpid !== snp.snpid
      );
      snpsReferencingThis.forEach((referencingSnp) => {
        // Check if this exact connection already exists (same source and target)
        const existingConnection = allReferencingSNPs.find(
          (s) => s.snpid === referencingSnp.snpid && s.sourceSnp === snp.snpid
        );
        if (!existingConnection) {
          allReferencingSNPs.push({ ...referencingSnp, sourceSnp: snp.snpid });
        }
      });
    });

    setReferencedSNPs(allReferencedSNPs);
    setReferencingSNPs(allReferencingSNPs);
  }, [snpsToShowArcs, processedData]);

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />

      {/* Render arcs first (behind text) */}
      {referencedSNPs.map((referencedSnp) => {
        const sourceSnp = processedData.find((s) => s.snpid === referencedSnp.sourceSnp);
        if (!sourceSnp) return null;

        const x1 = sourceSnp.pixelStart + (sourceSnp.pixelEnd - sourceSnp.pixelStart) / 2;
        const x2 = referencedSnp.pixelStart + (referencedSnp.pixelEnd - referencedSnp.pixelStart) / 2;

        return (
          <path
            key={`reference-arc-${referencedSnp.snpid}-${sourceSnp.snpid}`}
            d={createArcPath(x1, x2, leadHeight, snpHeight, height)}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(referencedSnp.rsquare)}
            fill="none"
          />
        );
      })}

      {referencingSNPs.map((referencingSnp) => {
        const sourceSnp = processedData.find((s) => s.snpid === referencingSnp.sourceSnp);
        if (!sourceSnp) return null;

        const x1 = referencingSnp.pixelStart + (referencingSnp.pixelEnd - referencingSnp.pixelStart) / 2;
        const x2 = sourceSnp.pixelStart + (sourceSnp.pixelEnd - sourceSnp.pixelStart) / 2;

        return (
          <path
            key={`referencing-arc-${referencingSnp.snpid}-${sourceSnp.snpid}`}
            d={createArcPath(x1, x2, leadHeight, snpHeight, height)}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(referencingSnp.rsquare)}
            fill="none"
          />
        );
      })}
      <g transform={`translate(0, ${height - snpHeight})`}>
        {processedData.map((snp: SNP, i: number) => {
          const isSelected = (show || []).includes(snp.snpid);

          return (
            <rect
              key={`${id}_${i}`}
              height={isLead(snp) ? leadHeight : snpHeight}
              width={snp.pixelEnd - snp.pixelStart + padding}
              x={snp.pixelStart - padding / 2}
              y={isLead(snp) ? -leadHeight + snpHeight : 0}
              fill={getFill(snp, color)}
              stroke={isSelected ? text : "none"}
              strokeWidth={isSelected ? 1 : 0}
              onClick={() => {
                handleClick(snp);
                // Add SNP to show list to persistently display arcs
                const currentShow = show || [];
                const snpId = snp.snpid;
                if (!currentShow.includes(snpId)) {
                  editTrack(id, { show: [...currentShow, snpId] });
                } else {
                  // Remove from show list if already there (toggle behavior)
                  editTrack(id, { show: currentShow.filter((showId) => showId !== snpId) });
                }
              }}
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

      {/* Render text labels last (on top of everything) */}
      {referencedSNPs.map((referencedSnp) => {
        const snpCenterX = referencedSnp.pixelStart + (referencedSnp.pixelEnd - referencedSnp.pixelStart) / 2;
        const labelY = isLead(referencedSnp) ? height - leadHeight - 2 : height - snpHeight - 2; // Just above the SNP rectangle

        return (
          <text
            key={`reference-label-${referencedSnp.snpid}-${referencedSnp.sourceSnp}`}
            x={snpCenterX}
            y={labelY}
            textAnchor="middle"
            fontSize="10"
            fill={text}
          >
            {referencedSnp.rsquare}
          </text>
        );
      })}

      {referencingSNPs.map((referencingSnp) => {
        const snpCenterX = referencingSnp.pixelStart + (referencingSnp.pixelEnd - referencingSnp.pixelStart) / 2;
        const labelY = isLead(referencingSnp) ? height - leadHeight - 2 : height - snpHeight - 2; // Just above the SNP rectangle

        return (
          <text
            key={`referencing-label-${referencingSnp.snpid}-${referencingSnp.sourceSnp}`}
            x={snpCenterX}
            y={labelY}
            textAnchor="middle"
            fontSize="10"
            fill={text}
          >
            {referencingSnp.rsquare}
          </text>
        );
      })}
    </g>
  );
}

function Tooltip(snp: SNP) {
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect width={150} height={38} y={0} fill={background} />
      <text fontSize={12} x={5} y={12}>
        {snp.snpid}
      </text>
      <text fontSize={12} x={5} y={24}>
        {snp.chromosome}:{snp.start}-{snp.stop}
      </text>
      <text fontSize={12} x={5} y={36}>
        {isLead(snp) ? "Lead" : snp.rsquare}
      </text>
    </g>
  );
}

const createArcPath = (x1: number, x2: number, y1: number, y2: number, arcHeight: number) => {
  const controlX = x1 + (x2 - x1) * 0.5;
  const controlY = y1 - arcHeight;
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
};

const getWidth = (score: string): number => {
  const numScore = parseFloat(score);
  if (isNaN(numScore)) return 4;
  return linearScale(numScore, { min: 0.7, max: 1 }, { min: 1, max: 8 });
};

const isLead = (snp: SNP) => {
  return snp.rsquare === "*";
};

const getFill = (snp: SNP, color: string) => {
  if (isLead(snp)) {
    return isDark(color) ? lighten(color, 0.5) : darken(color, 0.2);
  }
  return color;
};
