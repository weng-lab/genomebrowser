import type { cytoband, cytobandData } from "./cytobandData";
import type { CytobandColors } from "./cytobandsTypes";

type cytobandSvgProps = {
  data: cytobandData;
  width: number;
  height: number;
  colors: CytobandColors;
  clipId: string;
};

export function cytobandSvg({ data, width, height, colors, clipId }: cytobandSvgProps) {
  const bandY = height * 0.1;
  const bandHeight = height * 0.8;
  const span = data.extent.end - data.extent.start;
  let centromereIndex = 0;

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect height={height} width={width} x={0} y={0} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid="cytobands">
        {data.bands.map((band, index) => {
          const start = Math.max(
            data.extent.start,
            Math.min(data.extent.end, band.coordinates.start),
          );
          const end = Math.max(start, Math.min(data.extent.end, band.coordinates.end));
          const x = ((start - data.extent.start) / span) * width;
          const bandWidth = ((end - start) / span) * width;
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

function getBandKey(band: cytoband, index: number) {
  return `${band.coordinates.start}:${band.coordinates.end}:${band.stain}:${index}`;
}
