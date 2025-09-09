import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/BrowserContext";
import { useTheme } from "../../../store/themeStore";
import { LDProps } from "./types";
import useInteraction from "../../../hooks/useInteraction";

export default function LD({ id, data, height, color, dimensions, onClick, onHover, onLeave, tooltip }: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const padding = 4;

  const getDomain = useBrowserStore((state) => state.getExpandedDomain);

  const processedData = useMemo(() => {
    const domain = getDomain();
    const withinDomain = data?.filter((snp: any) => {
      const pastStart = snp.start >= domain.start;
      const behindEnd = snp.stop <= domain.end;
      const sameDomain = snp.chromosome === domain.chromosome;
      return pastStart && behindEnd && sameDomain;
    });
    return (
      withinDomain?.map((snp: any) => ({
        ...snp,
        pixelStart: ((snp.start - domain.start) * totalWidth) / (domain.end - domain.start),
        pixelEnd: ((snp.stop - domain.start) * totalWidth) / (domain.end - domain.start),
      })) || []
    );
  }, [data]);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip: tooltip || Tooltip,
  });

  const [hovered, setHovered] = useState<any>(null);
  const [anchor, setAnchor] = useState<any>(null);

  useEffect(() => {
    if (!hovered) {
      setAnchor(null);
      return;
    }
    if (hovered.ldblocksnpid === "Lead") {
      setAnchor(null);
      return;
    }
    const snp = processedData.find((snp: any) => snp.snpid === hovered.ldblocksnpid);
    if (snp) {
      setAnchor(snp);
    }
  }, [hovered]);

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <g transform={`translate(0, ${height / 2})`}>
        {processedData.map((snp: any, i: number) => (
          <rect
            key={`${id}_${i}`}
            height={height / 2}
            width={snp.pixelEnd - snp.pixelStart + padding}
            x={snp.pixelStart - padding / 2}
            y={0}
            fill={color}
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
        ))}
      </g>
    </g>
  );
}

function Tooltip(rect: any) {
  console.log(rect);
  return (
    <g>
      <rect width={150} height={38} y={0} fill="white" stroke="black" strokeWidth={1} />
      <text fontSize={12} x={5} y={12}>
        {rect.snpid}
      </text>
      <text fontSize={12} x={5} y={24}>
        {rect.chromosome}:{rect.start}-{rect.stop}
      </text>
      <text fontSize={12} x={5} y={36}>
        {rect.rsquare === "*" ? "Lead" : rect.rsquare}
      </text>
    </g>
  );
}
