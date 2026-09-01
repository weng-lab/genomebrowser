import type { Cytoband } from "@weng-lab/genomic-reader";
import type { CytobandColors } from "./cytobandsTypes";

type cytobandSvgProps = {
  chromosome: string;
  chromosomeLength: number;
  bands: readonly Cytoband[];
  width: number;
  height: number;
  colors: CytobandColors;
  clipId: string;
};

export function cytobandSvg({
  chromosome,
  chromosomeLength,
  bands,
  width,
  height,
  colors,
  clipId,
}: cytobandSvgProps) {
  const bandY = height * 0.1;
  const bandHeight = height * 0.8;
  const renderedBands = getRenderedBands(bands, chromosome, chromosomeLength);
  let centromereIndex = 0;

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect height={height} width={width} x={0} y={0} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid="cytobands">
        {renderedBands.map(({ band, start, end }, index) => {
          const x = (start / chromosomeLength) * width;
          const bandWidth = ((end - start) / chromosomeLength) * width;
          if (band.stain === "acen") {
            const opening = centromereIndex++ === 0;
            const d = opening
              ? `M ${x} ${bandY} L ${x + bandWidth} ${height / 2} L ${x} ${bandY + bandHeight} Z`
              : `M ${x + bandWidth} ${bandY} L ${x} ${height / 2} L ${x + bandWidth} ${bandY + bandHeight} Z`;
            return (
              <path
                d={d}
                data-stain={band.stain}
                fill={colors.centromere}
                key={getBandKey(band, index)}
              />
            );
          }
          const appearance = getBandAppearance(band.stain, colors);
          return (
            <rect
              data-stain={band.stain}
              fill={appearance.fill}
              fillOpacity={appearance.opacity}
              height={bandHeight}
              key={getBandKey(band, index)}
              width={bandWidth}
              x={x}
              y={bandY}
            />
          );
        })}
      </g>
    </>
  );
}

function getBandAppearance(stain: string, colors: CytobandColors) {
  if (stain === "gneg") return { fill: colors.negative, opacity: 1 };
  if (stain === "gvar") return { fill: colors.variable, opacity: 1 };
  if (stain === "stalk") return { fill: colors.stalk, opacity: 1 };
  const positive = /^gpos(\d+)$/.exec(stain);
  if (positive) {
    const intensity = Math.max(0, Math.min(100, Number(positive[1]))) / 100;
    return { fill: colors.positive, opacity: intensity };
  }
  return { fill: colors.unknown, opacity: 1 };
}

function getRenderedBands(
  bands: readonly Cytoband[],
  chromosome: string,
  chromosomeLength: number,
) {
  if (chromosomeLength <= 0) return [];

  return bands
    .flatMap((band) => {
      if (
        band.chromosome !== chromosome ||
        !Number.isSafeInteger(band.start) ||
        !Number.isSafeInteger(band.end) ||
        band.start >= band.end ||
        band.end <= 0 ||
        band.start >= chromosomeLength
      ) {
        return [];
      }
      return [{ band, start: Math.max(0, band.start), end: Math.min(chromosomeLength, band.end) }];
    })
    .sort(
      (left, right) =>
        left.start - right.start ||
        left.end - right.end ||
        left.band.stain.localeCompare(right.band.stain) ||
        left.band.name.localeCompare(right.band.name),
    );
}

function getBandKey(band: Cytoband, index: number) {
  return `${band.chromosome}:${band.start}:${band.end}:${band.name}:${band.stain}:${index}`;
}
