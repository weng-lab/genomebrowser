/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG interval groups have no native button element; glyphs provide keyboard activation. */
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { createGenomicXScale } from "../shared/coordinates";
import { useRowLayout } from "../shared/layout";
import { packViewportRows } from "../shared/layout/viewportRows";
import { intersectsVisibleRegion } from "../shared/viewport";
import { ClinGenDetails } from "./details";
import type { ClinGenConfig } from "./schema";
import type { ClinGenData, ClinGenItem, ClinGenDisplay } from "./types";

type Props = TrackRendererProps<ClinGenConfig, ClinGenData>;
type Glyph = {
  item: ClinGenItem;
  key: string;
  start: number;
  end: number;
  label: string;
  labelX: number;
  bounds: { start: number; end: number };
};
const LABEL_PADDING = 4;
const PACK_GAP = 4;

export function DenseClinGen(props: Props) {
  return <ClinGenIntervals {...props} mode="dense" />;
}
export function PackedClinGen(props: Props) {
  return <ClinGenIntervals {...props} mode="pack" />;
}
export function FullClinGen(props: Props) {
  return <ClinGenIntervals {...props} mode="full" />;
}

function layout(props: Props, mode: ClinGenDisplay) {
  const { data, config, region, width, visibleRegion } = props;
  const x = createGenomicXScale(region, width);
  const fontSize = Math.min(12, config.rowHeight * 0.6);
  const items = data.kind === "features" ? data.items : [];
  const viewportLeft = Math.max(0, x(visibleRegion.start));
  const viewportRight = Math.min(width, x(visibleRegion.end));
  const glyphs: Glyph[] = items
    .map((item, index) => {
      const start = Math.max(0, x(item.start));
      const end = Math.min(width, x(item.end));
      const available = Math.max(
        0,
        Math.min(end, viewportRight) - Math.max(start, viewportLeft) - LABEL_PADDING * 2,
      );
      const maxChars = Math.floor(available / (fontSize * 0.65));
      const name = item.name;
      const label =
        mode !== "dense" && config.showLabels && maxChars >= 4
          ? name.length <= maxChars
            ? name
            : name.slice(0, maxChars - 3) + "..."
          : "";
      return {
        item,
        key: `${item.start}:${item.end}:${item.name}:${index}`,
        start,
        end,
        label,
        labelX: Math.max(start, viewportLeft) + LABEL_PADDING,
        bounds: { start, end },
      };
    })
    .filter((glyph) => glyph.end > glyph.start);
  const visible = (glyph: Glyph) => intersectsVisibleRegion(glyph.item, visibleRegion);
  if (mode === "dense") return { rows: [glyphs], visibleRowCount: 1, fontSize, viewportLeft };
  if (mode === "full") {
    const visibleItems = glyphs.filter(visible);
    return {
      rows: [...visibleItems, ...glyphs.filter((glyph) => !visible(glyph))].map((glyph) => [glyph]),
      visibleRowCount: visibleItems.length,
      fontSize,
      viewportLeft,
    };
  }
  return {
    ...packViewportRows(glyphs, (glyph) => glyph.bounds, visible, { gap: PACK_GAP }),
    fontSize,
    viewportLeft,
  };
}

function ClinGenIntervals(props: Props & { mode: ClinGenDisplay }) {
  const { id, data, config, width, mode } = props;
  const theme = useTheme();
  const { rows, visibleRowCount, fontSize, viewportLeft } = layout(props, mode);
  const { rowHeight, trackHeight } = useRowLayout(
    id,
    data.kind === "features" ? visibleRowCount : 1,
    config,
  );
  const interaction = useInteraction<ClinGenItem>();
  const tooltip = useTooltip<ClinGenItem, ClinGenConfig>();
  const [selection, setSelection] = useState<{ data: ClinGenData; item: ClinGenItem } | null>(null);
  const select = (item: ClinGenItem) => {
    tooltip.hide();
    setSelection({ data, item });
    interaction?.onClick?.(item);
  };

  return (
    <g data-clingen-mode={mode} style={{ fontFamily: theme.typography.fontFamily }}>
      <rect width={width} height={trackHeight} fill="transparent" pointerEvents="none" />
      {data.kind === "detail-required" ? (
        <text
          x={viewportLeft + LABEL_PADDING}
          y={rowHeight * 0.75}
          fontSize={fontSize}
          fill={theme.palette.text.secondary}
        >
          Zoom in for ClinGen annotations
        </text>
      ) : (
        rows.map((row, rowIndex) => (
          <g key={rowIndex} transform={`translate(0,${rowIndex * rowHeight})`}>
            {row.map((glyph) => (
              <g
                key={glyph.key}
                data-clingen-feature={glyph.item.name}
                role="button"
                aria-label={`Details for ${glyph.item.name}`}
                tabIndex={intersectsVisibleRegion(glyph.item, props.visibleRegion) ? 0 : -1}
                style={{ cursor: "pointer" }}
                onClick={() => select(glyph.item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    select(glyph.item);
                  }
                }}
                onMouseEnter={(event) => {
                  interaction?.onHover?.(glyph.item);
                  tooltip.show(glyph.item, event);
                }}
                onMouseLeave={() => {
                  interaction?.onLeave?.(glyph.item);
                  tooltip.hide();
                }}
              >
                <rect
                  data-clingen-interval=""
                  x={glyph.start}
                  y={rowHeight * 0.15}
                  width={Math.max(1, glyph.end - glyph.start)}
                  height={rowHeight * 0.7}
                  fill={glyph.item.color}
                />
                {glyph.label && (
                  <text
                    data-clingen-label=""
                    x={glyph.labelX}
                    y={rowHeight / 2}
                    fontSize={fontSize}
                    dominantBaseline="middle"
                    fill={theme.palette.getContrastText(glyph.item.color)}
                    pointerEvents="none"
                  >
                    {glyph.label}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))
      )}
      {selection?.data === data && (
        <ClinGenDetails item={selection.item} trackId={id} close={() => setSelection(null)} />
      )}
    </g>
  );
}
