import { useEffect, useMemo, useState } from "react";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import { useTheme } from "../../../store/themeStore";
import { LDProps, SNP } from "./types";
import useInteraction from "../../../hooks/useInteraction";
import { darken, isDark, lighten } from "../../../utils/color";
import { useXTransform } from "../../../hooks/useXTransform";
import { createArcPath, getFill, getPrimaryRSquare, getRSquareForTarget, getWidth, isLead } from "./helpers";

export default function LD({ id, data, height, color, dimensions, show, showScore = true, onClick, onHover, onLeave, tooltip }: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  // const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);
  const padding = 4;

  const getDomain = useBrowserStore((state) => state.getExpandedDomain);
  const editTrack = useTrackStore((state) => state.editTrack);

  const { x } = useXTransform(totalWidth);

  // must add up to height
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
        pixelStart: x(snp.start),
        pixelEnd: x(snp.stop),
      })) || []
    );
  }, [data, x]);

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
        // Handle comma-separated ldblocksnpids
        const ldblocksnpids = snp.ldblocksnpid.split(",").map((id) => id.trim());

        ldblocksnpids.forEach((ldblocksnpid) => {
          const referencedSnp = processedData.find((s: SNP) => s.snpid === ldblocksnpid);
          if (referencedSnp) {
            // Check if this exact connection already exists (same source and target)
            const existingConnection = allReferencedSNPs.find(
              (s) => s.snpid === referencedSnp.snpid && s.sourceSnp === snp.snpid && s.targetSnpId === ldblocksnpid
            );
            if (!existingConnection) {
              // Get the correct rsquare value for this specific connection
              const correctRSquare = getRSquareForTarget(snp, ldblocksnpid);
              allReferencedSNPs.push({
                ...referencedSnp,
                sourceSnp: snp.snpid,
                targetSnpId: ldblocksnpid,
                rsquare: correctRSquare,
              });
            }
          }
        });
      }

      // Add referencing SNPs (SNPs that reference this SNP)
      // Need to check if any SNP has this SNP's ID in their comma-separated ldblocksnpid
      const snpsReferencingThis = processedData.filter((s: SNP) => {
        if (s.snpid === snp.snpid) return false; // Don't include self
        if (s.ldblocksnpid === "Lead") return false; // Lead SNPs don't reference others

        // Check if this SNP's ID is in the comma-separated list
        const ldblocksnpids = s.ldblocksnpid.split(",").map((id) => id.trim());
        return ldblocksnpids.includes(snp.snpid);
      });

      snpsReferencingThis.forEach((referencingSnp) => {
        // Check if this exact connection already exists (same source and target)
        const existingConnection = allReferencingSNPs.find(
          (s) => s.snpid === referencingSnp.snpid && s.sourceSnp === snp.snpid && s.targetSnpId === snp.snpid
        );
        if (!existingConnection) {
          // Get the correct rsquare value for this specific connection
          const correctRSquare = getRSquareForTarget(referencingSnp, snp.snpid);
          allReferencingSNPs.push({
            ...referencingSnp,
            sourceSnp: snp.snpid,
            targetSnpId: snp.snpid,
            rsquare: correctRSquare,
          });
        }
      });
    });

    setReferencedSNPs(allReferencedSNPs);
    setReferencingSNPs(allReferencingSNPs);
  }, [snpsToShowArcs, processedData]);

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      {/*<rect width={totalWidth} height={height} fill={background} />*/}

      {/* Render arcs first (behind text) */}
      {referencedSNPs.map((referencedSnp) => {
        const sourceSnp = processedData.find((s) => s.snpid === referencedSnp.sourceSnp);
        if (!sourceSnp) return null;

        return (
          <path
            key={`reference-arc-${referencedSnp.snpid}-${sourceSnp.snpid}`}
            d={createArcPath(sourceSnp, referencedSnp, height, leadHeight, snpHeight)}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(referencedSnp.rsquare)}
            fill="none"
            opacity={0.5}
          />
        );
      })}

      {referencingSNPs.map((referencingSnp) => {
        const sourceSnp = processedData.find((s) => s.snpid === referencingSnp.sourceSnp);
        if (!sourceSnp) return null;

        return (
          <path
            key={`referencing-arc-${referencingSnp.snpid}-${sourceSnp.snpid}`}
            d={createArcPath(referencingSnp, sourceSnp, height, leadHeight, snpHeight)}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(referencingSnp.rsquare)}
            fill="none"
            opacity={0.5}
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
      {showScore && referencedSNPs.map((referencedSnp) => {
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

      {showScore && referencingSNPs.map((referencingSnp) => {
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
      <rect width={180} height={50} y={0} fill={background} />
      <text fontSize={14} x={5} y={16}>
        {snp.snpid}
      </text>
      <text fontSize={14} x={5} y={32}>
        {snp.chromosome}:{snp.start}-{snp.stop}
      </text>
      <text fontSize={14} x={5} y={48}>
        {isLead(snp) ? "Lead" : getPrimaryRSquare(snp)}
      </text>
    </g>
  );
}
