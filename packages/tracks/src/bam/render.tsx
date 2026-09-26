import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import type { BamRecord, TwoBitRecord } from "@weng-lab/genomic-reader";
import { memo, useRef, useState, type MouseEvent } from "react";
import { clientXToTrackX, createGenomicXScale } from "../shared/coordinates";
import { useTrackHeight } from "../shared/layout";
import { ValueLabels } from "../shared/ValueLabels";
import { binCoverage, computeCoverageRuns, findCoverageBin, type BamCoverageBin } from "./coverage";
import { buildCigarPaths, roundPixel } from "./cigarPaths";
import { filterBamRecords } from "./filters";
import {
  computeJunctions,
  filterJunctions,
  layoutJunctionArcs,
  type JunctionArc,
} from "./junctions";
import { darkenBamColor, layoutBam, type BamRowAssignment } from "./layout";
import type { BamConfig, BamData, BamDisplay, BamTooltipItem } from "./types";

type Props = TrackRendererProps<BamConfig, BamData>;
export function DenseBam(props: Props) {
  return <BamRenderer {...props} display="dense" />;
}
export function SquishBam(props: Props) {
  return <BamRenderer {...props} display="squish" />;
}
export function PackBam(props: Props) {
  return <BamRenderer {...props} display="pack" />;
}
export function FullBam(props: Props) {
  return <BamRenderer {...props} display="full" />;
}

const STATUS_HEIGHT = 14;
const SECTION_GAP = 4;

/** The status line, if any, and whether it replaces every section. */
function bamStatus(config: BamConfig, data: BamData, visibleRegion: Props["visibleRegion"]) {
  if (visibleRegion.end - visibleRegion.start >= config.maxWindow)
    return { status: "Zoom in to see BAM track", blocked: true };
  if (data.message !== undefined) return { status: data.message, blocked: true };
  if (data.referenceError)
    return {
      status: "Reference unavailable; showing CIGAR-defined mismatches only.",
      blocked: false,
    };
  return { status: undefined, blocked: false };
}

/**
 * Stacks the shown sections below an optional status line, separated by gaps.
 * Hidden sections have no top and take no space.
 */
function stackSections(
  config: BamConfig,
  status: string | undefined,
  alignmentsHeight: number | undefined,
) {
  const heights = [
    config.coverage.show ? config.coverage.height : undefined,
    config.junctions.show ? config.junctions.height : undefined,
    alignmentsHeight,
  ];
  let bottom = status ? STATUS_HEIGHT : 0;
  let placed = 0;
  const [coverageTop, junctionsTop, alignmentsTop] = heights.map((height) => {
    if (height === undefined) return undefined;
    const top = bottom + (placed > 0 ? SECTION_GAP : 0);
    placed++;
    bottom = top + height;
    return top;
  });
  return { coverageTop, junctionsTop, alignmentsTop, height: Math.max(STATUS_HEIGHT, bottom) };
}

function BamRenderer({
  id,
  config,
  data,
  region,
  visibleRegion,
  width,
  display,
}: Props & { display: BamDisplay }) {
  const { status, blocked } = bamStatus(config, data, visibleRegion);
  const records = blocked ? [] : filterBamRecords(data.records, config.filters, region);
  // Rows assigned for the previous data, so reads keep their rows when new data arrives.
  const [rowMemory, setRowMemory] = useState<{
    data: BamData;
    config: BamConfig;
    assignment: BamRowAssignment;
  }>();
  const layout = config.alignments.show
    ? layoutBam(records, config, display, region, visibleRegion, width, rowMemory?.assignment)
    : undefined;
  if (layout && (rowMemory?.data !== data || rowMemory.config !== config))
    setRowMemory({ data, config, assignment: layout.assignment });
  const {
    coverageTop,
    junctionsTop,
    alignmentsTop,
    height: trackHeight,
  } = blocked
    ? { height: STATUS_HEIGHT }
    : stackSections(
        config,
        status,
        layout &&
          Math.max(1, layout.visibleRowCount) * layout.rowHeight +
            (layout.hiddenCount > 0 ? STATUS_HEIGHT : 0),
      );
  useTrackHeight(id, trackHeight);
  const x = createGenomicXScale(region, width);
  return (
    <g data-bam-display={display} style={{ userSelect: "none" }}>
      <rect width={width} height={trackHeight} fill="transparent" pointerEvents="none" />
      {status && (
        <text x={Math.max(0, x(visibleRegion.start)) + 4} y={11} fontSize={11} fill="#475569">
          {status}
        </text>
      )}
      {coverageTop !== undefined && (
        <CoverageSection
          records={records}
          config={config.coverage}
          region={region}
          visibleRegion={visibleRegion}
          width={width}
          top={coverageTop}
          trackHeight={trackHeight}
        />
      )}
      {junctionsTop !== undefined && (
        <JunctionSection
          records={records}
          config={config.junctions}
          region={region}
          width={width}
          top={junctionsTop}
        />
      )}
      {layout && alignmentsTop !== undefined && (
        <AlignmentSection
          layout={layout}
          config={config}
          reference={data.reference}
          region={region}
          visibleRegion={visibleRegion}
          width={width}
          display={display}
          top={alignmentsTop}
        />
      )}
    </g>
  );
}

function CoverageSection({
  records,
  config,
  region,
  visibleRegion,
  width,
  top,
  trackHeight,
}: {
  records: BamRecord[];
  config: BamConfig["coverage"];
  region: Props["region"];
  visibleRegion: Props["visibleRegion"];
  width: number;
  top: number;
  trackHeight: number;
}) {
  const { height, color, scale, graph, aggregation } = config;
  const x = createGenomicXScale(region, width);
  const runs = computeCoverageRuns(records, region);
  const bins = binCoverage(runs, region, width);
  let max = scale.mode === "fixed" ? scale.max : 1;
  if (scale.mode === "auto") {
    // Like BigWig, retain overscan for drawing but bin the viewport separately
    // for scaling. A render bin can contain a peak just outside the viewport.
    const regionSpan = region.end - region.start;
    const visibleSpan = visibleRegion.end - visibleRegion.start;
    const visibleWidth = regionSpan > 0 ? width * (visibleSpan / regionSpan) : width;
    for (const bin of binCoverage(runs, visibleRegion, visibleWidth)) {
      max = Math.max(max, bin[aggregation]);
    }
  }
  const y = (value: number) => roundPixel(height - (Math.min(value, max) / max) * height);
  let path = "";
  if (bins.length > 0 && graph === "bars") {
    path = `M ${roundPixel(x(bins[0].start))} ${height}`;
    for (const bin of bins) path += ` V ${y(bin[aggregation])} H ${roundPixel(x(bin.end))}`;
    path += ` V ${height} Z`;
  } else if (bins.length > 0) {
    path = bins
      .map(
        (bin, index) =>
          `${index === 0 ? "M" : "L"} ${roundPixel((x(bin.start) + x(bin.end)) / 2)} ${y(bin[aggregation])}`,
      )
      .join(" ");
  }
  return (
    <g data-bam-section="coverage" data-scale-max={max} transform={`translate(0,${top})`}>
      <line x1={0} x2={width} y1={height} y2={height} stroke="#dddddd" strokeWidth={1} />
      {graph === "bars" ? (
        <path d={path} fill={color} />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      )}
      <CoverageHover bins={bins} region={region} width={width} height={height} />
      <ValueLabels
        height={trackHeight}
        ticks={[
          { value: max, y: top + 7 },
          { value: 0, y: top + height - 7 },
        ]}
      />
    </g>
  );
}

/** Hover state lives here so moving the pointer does not recompute coverage. */
function CoverageHover({
  bins,
  region,
  width,
  height,
}: {
  bins: BamCoverageBin[];
  region: Props["region"];
  width: number;
  height: number;
}) {
  const [hovered, setHovered] = useState<BamCoverageBin>();
  const tooltip = useTooltip<BamTooltipItem, BamConfig>();
  const x = createGenomicXScale(region, width);
  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const trackX = clientXToTrackX(
      event.clientX,
      event.currentTarget.getBoundingClientRect(),
      width,
    );
    const bin = findCoverageBin(
      bins,
      Math.floor(region.start + (trackX / width) * (region.end - region.start)),
    );
    if (bin === hovered) return;
    setHovered(bin);
    if (bin) tooltip.show(bin, event);
    else tooltip.hide();
  };
  return (
    <>
      {hovered && (
        <rect
          x={x(hovered.start)}
          width={Math.max(1, x(hovered.end) - x(hovered.start))}
          height={height}
          fill="#000000"
          fillOpacity={0.15}
          pointerEvents="none"
        />
      )}
      <rect
        width={width}
        height={height}
        fill="transparent"
        pointerEvents="all"
        onMouseMove={handleMouseMove}
        onMouseOut={() => {
          setHovered(undefined);
          tooltip.hide();
        }}
      />
    </>
  );
}

function JunctionSection({
  records,
  config,
  region,
  width,
  top,
}: {
  records: BamRecord[];
  config: BamConfig["junctions"];
  region: Props["region"];
  width: number;
  top: number;
}) {
  const { height, color, showCounts } = config;
  const x = createGenomicXScale(region, width);
  const arcs = layoutJunctionArcs(filterJunctions(computeJunctions(records), config), {
    x,
    width,
    height,
    showCounts,
  }).filter((arc) => arc.x2 >= 0 && arc.x1 <= width);
  return (
    <g data-bam-section="junctions" transform={`translate(0,${top})`}>
      <line x1={0} x2={width} y1={height - 1} y2={height - 1} stroke="#dddddd" strokeWidth={1} />
      {arcs.map((arc) => (
        <JunctionArcShape
          key={`${arc.junction.start}:${arc.junction.end}`}
          arc={arc}
          baseline={height - 1}
          color={color}
        />
      ))}
    </g>
  );
}

function JunctionArcShape({
  arc,
  baseline,
  color,
}: {
  arc: JunctionArc;
  baseline: number;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  const tooltip = useTooltip<BamTooltipItem, BamConfig>();
  const { junction } = arc;
  const d = `M ${arc.x1} ${baseline} Q ${(arc.x1 + arc.x2) / 2} ${arc.controlY} ${arc.x2} ${baseline}`;
  const dark = darkenBamColor(color);
  return (
    <g
      data-junction={`${junction.start}-${junction.end}`}
      data-support={junction.support}
      onMouseEnter={(event) => {
        setHovered(true);
        tooltip.show(junction, event);
      }}
      onMouseLeave={() => {
        setHovered(false);
        tooltip.hide();
      }}
    >
      <path
        d={d}
        fill="none"
        stroke={hovered ? dark : color}
        strokeWidth={arc.strokeWidth}
        pointerEvents="none"
      />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(8, arc.strokeWidth + 6)}
        pointerEvents="stroke"
      />
      {arc.label && (
        <text
          x={arc.label.x}
          y={arc.label.y}
          textAnchor="middle"
          fontSize={10}
          fill={dark}
          pointerEvents="none"
        >
          {junction.support}
        </text>
      )}
    </g>
  );
}

function AlignmentSection({
  layout,
  config,
  reference,
  region,
  visibleRegion,
  width,
  display,
  top,
}: {
  layout: ReturnType<typeof layoutBam>;
  config: BamConfig;
  reference: TwoBitRecord[];
  region: Props["region"];
  visibleRegion: Props["visibleRegion"];
  width: number;
  display: BamDisplay;
  top: number;
}) {
  const { rowHeight } = layout;
  const x = createGenomicXScale(region, width);
  const interaction = useInteraction<BamRecord>();
  const tooltip = useTooltip<BamTooltipItem, BamConfig>();
  const hoveredRef = useRef<BamRecord | undefined>(undefined);
  const showBases =
    (display === "pack" || display === "full") &&
    visibleRegion.end - visibleRegion.start <= config.alignments.sequenceMaxWindow &&
    rowHeight >= 10;
  const glyphs = layout.rows.flatMap((row, rowIndex) => row.map((glyph) => ({ glyph, rowIndex })));
  const records = new Map(glyphs.map(({ glyph }) => [glyph.key, glyph.record]));
  // One set of handlers for every read keeps each read free of hook subscriptions.
  const recordAt = (target: EventTarget | null) => {
    const index = target instanceof Element ? target.closest("[data-read-index]") : null;
    return index ? records.get(index.getAttribute("data-read-index") ?? "") : undefined;
  };
  const leave = () => {
    const previous = hoveredRef.current;
    if (!previous) return;
    hoveredRef.current = undefined;
    interaction?.onLeave?.(previous);
    tooltip.hide();
  };
  return (
    <g
      data-bam-section="alignments"
      style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
      onClick={(event) => {
        const record = recordAt(event.target);
        if (record) interaction?.onClick?.(record);
      }}
      onMouseOver={(event) => {
        const record = recordAt(event.target);
        if (record === hoveredRef.current) return;
        leave();
        if (!record) return;
        hoveredRef.current = record;
        interaction?.onHover?.(record);
        tooltip.show(record, event);
      }}
      onMouseOut={(event) => {
        if (recordAt(event.relatedTarget) !== hoveredRef.current) leave();
      }}
    >
      {layout.hiddenCount > 0 && (
        <text
          data-bam-hidden={layout.hiddenCount}
          x={Math.max(0, x(visibleRegion.start)) + 4}
          y={top + Math.max(1, layout.visibleRowCount) * rowHeight + 11}
          fontSize={11}
          fill="#475569"
        >
          {`${layout.hiddenCount.toLocaleString("en-US")} more alignments not drawn (row limit ${config.alignments.maxRows}). Coverage and junctions include them.`}
        </text>
      )}
      {glyphs.map(({ glyph, rowIndex }) => {
        const { record } = glyph;
        return (
          <AlignmentGlyph
            key={glyph.key}
            readKey={glyph.key}
            row={rowIndex}
            record={record}
            y={top + rowIndex * rowHeight}
            start={glyph.start}
            end={glyph.end}
            labelX={glyph.label?.x}
            fontSize={layout.fontSize}
            reference={reference}
            regionStart={region.start}
            regionEnd={region.end}
            width={width}
            rowHeight={rowHeight}
            color={
              record.strand === "+"
                ? config.alignments.forwardColor
                : config.alignments.reverseColor
            }
            showBases={showBases}
          />
        );
      })}
    </g>
  );
}

/**
 * One read. Props are primitives or stable references so that re-rendering the
 * section, such as after a pan, skips reads whose drawing has not changed.
 */
const AlignmentGlyph = memo(function AlignmentGlyph({
  readKey,
  row,
  record,
  y,
  start,
  end,
  labelX,
  fontSize,
  reference,
  regionStart,
  regionEnd,
  width,
  rowHeight,
  color,
  showBases,
}: {
  readKey: string;
  row: number;
  record: BamRecord;
  y: number;
  start: number;
  end: number;
  labelX: number | undefined;
  fontSize: number;
  reference: TwoBitRecord[];
  regionStart: number;
  regionEnd: number;
  width: number;
  rowHeight: number;
  color: string;
  showBases: boolean;
}) {
  return (
    <g
      data-read-index={readKey}
      data-bam-row={row}
      data-bam-read={record.readName}
      aria-label={`${record.readName}, ${record.strand} strand, ${record.chromosome}:${record.start}-${record.end}`}
      transform={`translate(0,${y})`}
    >
      <rect
        x={start}
        y={0}
        width={Math.max(1, end - start)}
        height={rowHeight}
        fill="transparent"
      />
      <AlignmentShape
        record={record}
        reference={reference}
        regionStart={regionStart}
        regionEnd={regionEnd}
        width={width}
        rowHeight={rowHeight}
        color={color}
        showBases={showBases}
      />
      {labelX !== undefined && (
        <text
          x={labelX}
          y={rowHeight / 2}
          dominantBaseline="central"
          textAnchor="start"
          fontSize={fontSize}
          fontFamily="monospace"
          fill={darkenBamColor(color)}
        >
          {record.readName}
        </text>
      )}
    </g>
  );
});

/** Draws one read's backbone, CIGAR marks, strand arrow, and letters when zoomed in. */
function AlignmentShape({
  record,
  reference,
  regionStart,
  regionEnd,
  width,
  rowHeight,
  color,
  showBases,
}: {
  record: BamRecord;
  reference: TwoBitRecord[];
  regionStart: number;
  regionEnd: number;
  width: number;
  rowHeight: number;
  color: string;
  showBases: boolean;
}) {
  const x = createGenomicXScale(
    { chromosome: record.chromosome, start: regionStart, end: regionEnd },
    width,
  );
  const { paths, blocks, start, end } = buildCigarPaths(record, {
    x,
    width,
    regionStart,
    regionEnd,
    rowHeight,
  });
  const y = rowHeight * 0.2;
  const height = rowHeight * 0.6;
  const middle = rowHeight / 2;
  const dark = darkenBamColor(color);
  const direction = record.strand === "+" ? 1 : -1;
  const tip = record.strand === "+" ? end : start;
  const arrow = Math.min(3, height / 2, (end - start) / 2);
  const blockStroke = Math.min(1, height / 4);
  return (
    <g pointerEvents="none">
      <line x1={start} x2={end} y1={middle} y2={middle} stroke={color} strokeOpacity={0.35} />
      {record.cigar.length === 0 && (
        <rect
          data-cigar-unavailable
          x={start}
          y={y}
          width={Math.max(1, end - start)}
          height={height}
          fill="none"
          stroke={color}
          strokeWidth={blockStroke}
        />
      )}
      {paths.D && <path data-cigar="D" d={paths.D} stroke={color} fill="none" />}
      {paths.N && (
        <path data-cigar="N" d={paths.N} stroke={color} strokeDasharray="3 2" fill="none" />
      )}
      {paths.M && (
        <path data-cigar="M" d={paths.M} fill={dark} stroke={color} strokeWidth={blockStroke} />
      )}
      {paths.X && (
        <path data-cigar="X" d={paths.X} fill="#ef4444" stroke={color} strokeWidth={blockStroke} />
      )}
      {paths.I && (
        <path data-cigar="I" d={paths.I} stroke="#7e22ce" strokeWidth={1.5} fill="none" />
      )}
      {paths.S && <path data-cigar="S" d={paths.S} stroke={color} strokeWidth={1.5} fill="none" />}
      {showBases &&
        blocks.map(({ operation, position }) => (
          <AlignmentBases
            key={`${operation.referenceOffset}:${operation.sequenceOffset}`}
            record={record}
            operation={operation}
            position={position}
            reference={reference}
            x={x}
            regionStart={regionStart}
            regionEnd={regionEnd}
            pixelsPerBase={width / (regionEnd - regionStart)}
            rowHeight={rowHeight}
          />
        ))}
      {arrow > 0 && (
        <path
          d={`M ${tip - direction * arrow} ${middle - arrow} L ${tip} ${middle} L ${tip - direction * arrow} ${middle + arrow}`}
          stroke={color}
          strokeWidth={1}
          fill="none"
        />
      )}
    </g>
  );
}

/** Letters for one aligned block, with mismatches against the reference highlighted. */
function AlignmentBases({
  record,
  operation,
  position,
  reference,
  x,
  regionStart,
  regionEnd,
  pixelsPerBase,
  rowHeight,
}: {
  record: BamRecord;
  operation: BamRecord["cigar"][number];
  position: number;
  reference: TwoBitRecord[];
  x: (position: number) => number;
  regionStart: number;
  regionEnd: number;
  pixelsPerBase: number;
  rowHeight: number;
}) {
  const y = rowHeight * 0.2;
  const height = rowHeight * 0.6;
  const first = Math.max(0, regionStart - position);
  const count = Math.max(0, Math.min(operation.length, regionEnd - position) - first);
  return (
    <g data-bases={operation.op}>
      {Array.from({ length: count }, (_, i) => {
        const offset = i + first;
        const genomicPosition = position + offset;
        const base = record.sequence[operation.sequenceOffset + offset]?.toUpperCase();
        if (!base) return null;
        const ref = reference.find(
          (part) =>
            part.chromosome === record.chromosome &&
            part.start <= genomicPosition &&
            part.end > genomicPosition,
        );
        const referenceBase = ref?.sequence[genomicPosition - ref.start]?.toUpperCase();
        const mismatch =
          operation.op === "X" ||
          (operation.op === "M" &&
            referenceBase !== undefined &&
            "ACGT".includes(referenceBase) &&
            "ACGT".includes(base) &&
            base !== referenceBase);
        return (
          <g key={offset} data-mismatch={mismatch || undefined}>
            {mismatch && (
              <rect
                x={x(genomicPosition)}
                y={y}
                width={pixelsPerBase}
                height={height}
                fill="#ef4444"
              />
            )}
            <text
              x={x(genomicPosition) + pixelsPerBase / 2}
              y={rowHeight / 2}
              dominantBaseline="central"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize={Math.min(11, pixelsPerBase * 0.8, rowHeight * 0.7)}
              fill="#ffffff"
            >
              {base}
            </text>
          </g>
        );
      })}
    </g>
  );
}
