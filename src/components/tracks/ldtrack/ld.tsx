import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/BrowserContext";
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
};

export default function LD({ id, data, height, color, dimensions, onClick, onHover, onLeave, tooltip }: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const padding = 4;
  const delta = useBrowserStore((state) => state.delta);
  const update = delta === 0;
  const getDomain = useBrowserStore((state) => state.getExpandedDomain);
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

  useEffect(() => {
    if (!hovered) {
      setReferencedSNPs([]);
      setReferencingSNPs([]);
      return;
    }

    if (hovered.ldblocksnpid !== "Lead") {
      const referencedSnp = processedData.find((snp: SNP) => snp.snpid === hovered.ldblocksnpid);
      setReferencedSNPs(referencedSnp ? [referencedSnp] : []);
    } else {
      setReferencedSNPs([]);
    }

    const snpsReferencingHovered = processedData.filter(
      (snp: SNP) => snp.ldblocksnpid === hovered.snpid && snp.snpid !== hovered.snpid
    );
    setReferencingSNPs(snpsReferencingHovered);
  }, [hovered, processedData]);

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />

      {hovered &&
        referencedSNPs.map((referencedSnp, index) => (
          <path
            key={`reference-arc-${index}`}
            d={createArcPath(
              hovered.pixelStart + (hovered.pixelEnd - hovered.pixelStart) / 2,
              referencedSnp.pixelStart + (referencedSnp.pixelEnd - referencedSnp.pixelStart) / 2,
              leadHeight,
              snpHeight,
              height
            )}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(referencedSnp.rsquare)}
            fill="none"
          />
        ))}

      {hovered &&
        referencingSNPs.map((referencingSnp, index) => (
          <path
            key={`referencing-arc-${index}`}
            d={createArcPath(
              referencingSnp.pixelStart + (referencingSnp.pixelEnd - referencingSnp.pixelStart) / 2,
              hovered.pixelStart + (hovered.pixelEnd - hovered.pixelStart) / 2,
              leadHeight,
              snpHeight,
              height
            )}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(referencingSnp.rsquare)}
            fill="none"
          />
        ))}
      <g transform={`translate(0, ${height - snpHeight})`}>
        {processedData.map((snp: SNP, i: number) => {
          return (
            <rect
              key={`${id}_${i}`}
              height={isLead(snp) ? leadHeight : snpHeight}
              width={snp.pixelEnd - snp.pixelStart + padding}
              x={snp.pixelStart - padding / 2}
              y={isLead(snp) ? -leadHeight + snpHeight : 0}
              fill={getFill(snp, color)}
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
