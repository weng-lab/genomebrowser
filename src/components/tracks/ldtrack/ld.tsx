import { useMemo } from "react";
import { useBrowserStore } from "../../../store/BrowserContext";
import { useTheme } from "../../../store/themeStore";
import { LDProps } from "./types";
import DenseBigBed from "../bigbed/dense";

export default function LD({ id, data, height, color, dimensions, onClick, onHover, onLeave, tooltip }: LDProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);

  const getDomain = useBrowserStore((state) => state.getExpandedDomain);

  const processedData = useMemo(() => {
    const domain = getDomain();
    const withinDomain = data?.filter((snp: any) => {
      const pastStart = snp.start >= domain.start;
      const behindEnd = snp.stop <= domain.end;
      const sameDomain = snp.chromosome === domain.chromosome;
      return pastStart && behindEnd && sameDomain;
    });
    console.log(withinDomain);
    return (
      withinDomain?.map((snp: any) => ({
        chr: snp.chromosome,
        start: snp.start - 50,
        end: snp.stop + 50,
        name: snp.snpid,
        score: snp.rsquare === "*" ? -1 : Math.round(snp.rsquare * 1000),
      })) || []
    );
  }, [data]);

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height / 2} fill={background} />
      <g transform={`translate(0, ${height / 2})`}>
        <DenseBigBed
          id={id}
          data={processedData}
          color={color}
          height={height / 2}
          dimensions={dimensions}
          verticalPadding={0}
          onHover={(rect) => {
            console.log(rect);
          }}
        />
      </g>
    </g>
  );
}
