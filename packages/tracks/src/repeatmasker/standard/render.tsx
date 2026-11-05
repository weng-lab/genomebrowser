import type { MouseEvent } from "react";
import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { createGenomicXScale } from "../../shared/coordinates";
import { useRowLayout } from "../../shared/layout";
import { packViewportRows } from "../../shared/layout/viewportRows";
import { repeatShade } from "./presentation";
import { RepeatClassLabel, REPEAT_CLASS_LABEL_WIDTH } from "./classLabel";
import type { StandardRepeatMaskerConfig } from "./schema";
import {
  repeatCategories,
  type StandardRepeatMaskerData,
  type StandardRepeatMaskerItem,
  type StandardRepeatMaskerRepeat,
} from "./types";

type Props = TrackRendererProps<StandardRepeatMaskerConfig, StandardRepeatMaskerData>;
type Mode = "full" | "pack" | "dense";
type ItemEvents = {
  onClick: () => void;
  onMouseEnter: (event: MouseEvent<SVGGElement>) => void;
  onMouseLeave: () => void;
};
type LayoutItem = {
  key: string;
  repeat: StandardRepeatMaskerRepeat;
  start: number;
  end: number;
  label: string;
  bounds: { start: number; end: number };
};
type LayoutInput = Pick<Props, "config" | "data" | "region" | "visibleRegion" | "width">;

export function FullStandardRepeatMasker(props: Props) {
  return <RepeatRows {...props} mode="full" />;
}
export function PackedStandardRepeatMasker(props: Props) {
  return <RepeatRows {...props} mode="pack" />;
}
export function DenseStandardRepeatMasker(props: Props) {
  return <RepeatRows {...props} mode="dense" />;
}

function layoutRepeats({ config, data, region, visibleRegion, width }: LayoutInput, mode: Mode) {
  const x = createGenomicXScale(region, width);
  const viewportLeft = Math.max(0, x(visibleRegion.start));
  const fontSize = Math.min(10, config.rowHeight * 0.4);
  const repeats = data.kind === "repeats" ? data.repeats : [];
  const occurrences = new Map<string, number>();
  const items: LayoutItem[] = repeats
    .map((repeat) => {
      const start = Math.max(0, x(repeat.start));
      const end = Math.min(width, x(repeat.end));
      const label =
        config.showLabels &&
        mode !== "dense" &&
        (mode !== "full" || start > viewportLeft + REPEAT_CLASS_LABEL_WIDTH) &&
        end - start > repeat.name.length * fontSize * 0.6 + 4
          ? repeat.name
          : "";
      const identity = `${repeat.chromosome}:${repeat.repeatId}:${repeat.start}:${repeat.end}`;
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);
      return {
        key: `${identity}:${occurrence}`,
        repeat,
        start,
        end,
        label,
        bounds: { start, end },
      };
    })
    .filter((item) => item.end > item.start);
  const visible = (item: LayoutItem) =>
    item.repeat.end > visibleRegion.start && item.repeat.start < visibleRegion.end;
  const pack = (values: LayoutItem[]) =>
    packViewportRows(values, (item) => item.bounds, visible, { gap: 4 }).rows;
  const bands =
    mode === "full"
      ? repeatCategories.map((category) => ({
          category,
          rows: pack(items.filter((item) => item.repeat.category === category)),
        }))
      : [{ category: "", rows: mode === "dense" ? [items] : pack(items) }];
  let rowCount = 0;
  const layouts = bands.map((band) => {
    const first = rowCount;
    rowCount += Math.max(1, band.rows.length);
    return { ...band, first };
  });
  const summary = data.kind !== "repeats" || mode === "dense";
  return { layouts, rowCount: summary ? 1 : rowCount, summary, fontSize, viewportLeft };
}

// Stored zoom bins contain coverage totals, not positions within each bin. Pixel coverage
// therefore estimates uniform coverage inside a stored bin and preserves its mean overlap.
function coverageCells(data: StandardRepeatMaskerData, region: Props["region"], width: number) {
  const count = Math.max(1, Math.ceil(width));
  const bpPerBin = (region.end - region.start) / count;
  const bins = Array.from({ length: count }, () => ({ covered: 0, total: 0 }));
  const records =
    data.kind === "summary" ? data.summaries : data.kind === "repeats" ? data.repeats : [];
  for (const record of records) {
    const first = Math.max(0, Math.floor((record.start - region.start) / bpPerBin));
    const last = Math.min(count - 1, Math.ceil((record.end - region.start) / bpPerBin) - 1);
    const fraction =
      record.kind === "summary" ? record.validCount / (record.end - record.start) : 1;
    for (let i = first; i <= last; i++) {
      const overlap = Math.max(
        0,
        Math.min(record.end, region.start + (i + 1) * bpPerBin) -
          Math.max(record.start, region.start + i * bpPerBin),
      );
      bins[i]!.covered += overlap * fraction;
      bins[i]!.total += overlap * fraction * (record.kind === "summary" ? record.mean : 1);
    }
  }
  return bins.flatMap((bin, index) => {
    if (bin.covered <= 0) return [];
    const start = region.start + index * bpPerBin;
    const end = Math.min(region.end, start + bpPerBin);
    const item: StandardRepeatMaskerItem = {
      kind: "summary",
      chromosome: region.chromosome,
      start: Math.floor(start),
      end: Math.ceil(end),
      validCount: Math.min(bpPerBin, bin.covered),
      mean: bin.total / Math.min(bpPerBin, bin.covered),
    };
    const gray = Math.round(230 * (1 - Math.min(1, bin.covered / bpPerBin)));
    return [
      {
        key: `${region.chromosome}:${start}`,
        item,
        x: (index * width) / count,
        width: width / count,
        fill: `rgb(${gray},${gray},${gray})`,
      },
    ];
  });
}

function RepeatRows(props: Props & { mode: Mode }) {
  const { id, config, data, region, width, mode } = props;
  const { layouts, rowCount, summary, fontSize, viewportLeft } = layoutRepeats(props, mode);
  const { rowHeight, trackHeight } = useRowLayout(id, rowCount, config);
  const interaction = useInteraction<StandardRepeatMaskerItem>();
  const tooltip = useTooltip<StandardRepeatMaskerItem, StandardRepeatMaskerConfig>();
  const events = (item: StandardRepeatMaskerItem): ItemEvents => ({
    onClick: () => interaction?.onClick?.(item),
    onMouseEnter: (event) => {
      interaction?.onHover?.(item);
      tooltip.show(item, event);
    },
    onMouseLeave: () => {
      interaction?.onLeave?.(item);
      tooltip.hide();
    },
  });
  return (
    <g data-repeatmasker-mode={mode}>
      {mode === "full" && (
        <style>{`
          [data-repeatmasker-class-label][data-repeatmasker-class-hover="true"]:hover > [data-repeatmasker-band-highlight] {
            fill-opacity: 0.12;
          }
        `}</style>
      )}
      <rect width={width} height={trackHeight} fill="transparent" pointerEvents="none" />
      {summary ? (
        <>
          {coverageCells(data, region, width).map((cell) => (
            <g key={cell.key} data-repeatmasker-summary="" {...events(cell.item)}>
              <rect
                x={cell.x}
                y={rowHeight * 0.45}
                width={cell.width}
                height={rowHeight * 0.45}
                fill={cell.fill}
              />
            </g>
          ))}
          <text x={viewportLeft + 3} y={rowHeight * 0.35} fontSize={fontSize}>
            {data.kind === "repeats"
              ? "Use Full or Pack for individual repeats"
              : "Zoom in for individual repeats"}
          </text>
        </>
      ) : (
        layouts.map((band) => (
          <g key={band.category} data-repeatmasker-category={band.category}>
            {band.category && (
              <RepeatClassLabel
                category={band.category}
                top={band.first * rowHeight}
                height={Math.max(1, band.rows.length) * rowHeight}
                highlightOnHover={config.highlightClassOnHover}
              />
            )}
            {band.rows.flatMap((row, rowIndex) =>
              row.map((item) => (
                <RepeatGlyph
                  key={item.key}
                  item={item}
                  y={(band.first + rowIndex) * rowHeight}
                  rowHeight={rowHeight}
                  fontSize={fontSize}
                  mode={mode}
                  events={events(item.repeat)}
                />
              )),
            )}
          </g>
        ))
      )}
    </g>
  );
}

function strandArrows(item: LayoutItem, top: number, height: number, mode: Mode) {
  if (mode === "dense" || height < 4 || item.repeat.strand === ".") return "";
  const count = Math.floor((item.end - item.start) / 12);
  const direction = item.repeat.strand === "-" ? -1 : 1;
  return Array.from({ length: count }, (_, index) => {
    const center = item.start + ((index + 1) * (item.end - item.start)) / (count + 1);
    const middle = top + height / 2;
    const size = Math.min(2, height / 2 - 1);
    return `M ${center - direction * size} ${middle - size} L ${center + direction * size} ${middle} L ${center - direction * size} ${middle + size}`;
  }).join(" ");
}

function RepeatGlyph({
  item,
  y,
  rowHeight,
  fontSize,
  mode,
  events,
}: {
  item: LayoutItem;
  y: number;
  rowHeight: number;
  fontSize: number;
  mode: Mode;
  events: ItemEvents;
}) {
  const top = y + rowHeight * 0.52;
  const height = rowHeight * 0.4;
  const arrows = strandArrows(item, top, height, mode);
  const lightArrows = item.repeat.milliDiv + item.repeat.milliDel + item.repeat.milliIns < 280;
  return (
    <g
      data-repeatmasker-repeat={item.repeat.repeatId}
      aria-label={`${item.repeat.name}, ${item.repeat.repClass}/${item.repeat.repFamily}, strand ${item.repeat.strand}`}
      {...events}
    >
      <rect
        data-repeatmasker-block=""
        x={item.start}
        y={top}
        width={Math.max(1, item.end - item.start)}
        height={height}
        fill={repeatShade(item.repeat)}
      />
      {arrows && (
        <path
          data-repeatmasker-strand={item.repeat.strand}
          d={arrows}
          fill="none"
          stroke={lightArrows ? "#fff" : "#111"}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      {item.label && (
        <text
          data-repeatmasker-label=""
          textLength={item.label.length * fontSize * 0.6}
          lengthAdjust="spacingAndGlyphs"
          x={item.start + 2}
          y={y + rowHeight * 0.42}
          fontSize={fontSize}
        >
          {item.label}
        </text>
      )}
    </g>
  );
}
