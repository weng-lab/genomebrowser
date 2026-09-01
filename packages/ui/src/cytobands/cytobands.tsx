import { useId } from "react";
import type { CytobandColors, CytobandsProps } from "./cytobandsTypes";
import { cytobandSvg as CytobandSvg } from "./cytobandSvg";
import { highlightLayer as HighlightLayer } from "./highlightLayer";
import { currentRegionBracket as CurrentRegionBracket } from "./currentRegionBracket";

export type { CytobandColors, CytobandsProps } from "./cytobandsTypes";

const defaultColors: CytobandColors = {
  negative: "#ffffff",
  positive: "#111111",
  variable: "#8c8c8c",
  stalk: "#d95f5f",
  centromere: "#9e2a2b",
  unknown: "#b8b8b8",
};

const emptyHighlights: NonNullable<CytobandsProps["highlights"]> = [];

export function Cytobands({
  chromosome,
  chromosomeLength,
  bands,
  width,
  height,
  colors,
  highlights = emptyHighlights,
  currentRegion,
  renderHighlightTooltip,
  onHighlightClick,
  onHighlightPointerEnter,
  onHighlightPointerLeave,
}: CytobandsProps) {
  const clipId = `chromosome-ideogram-${useId().replaceAll(":", "")}`;
  const renderedWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const renderedHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  const renderedChromosomeLength =
    Number.isFinite(chromosomeLength) && chromosomeLength > 0 ? chromosomeLength : 0;

  return (
    <svg
      aria-label={`Chromosome ${chromosome} ideogram`}
      height={renderedHeight}
      role={onHighlightClick || currentRegion ? "group" : "img"}
      style={{ display: "block", overflow: "visible" }}
      viewBox={`0 0 ${renderedWidth} ${renderedHeight}`}
      width={renderedWidth}
    >
      <CytobandSvg
        bands={bands}
        chromosome={chromosome}
        chromosomeLength={renderedChromosomeLength}
        clipId={clipId}
        colors={{ ...defaultColors, ...colors }}
        height={renderedHeight}
        width={renderedWidth}
      />
      <HighlightLayer
        chromosome={chromosome}
        clipId={clipId}
        extentEnd={renderedChromosomeLength}
        extentStart={0}
        height={renderedHeight}
        highlights={highlights}
        onHighlightClick={onHighlightClick}
        onHighlightPointerEnter={onHighlightPointerEnter}
        onHighlightPointerLeave={onHighlightPointerLeave}
        renderHighlightTooltip={renderHighlightTooltip}
        width={renderedWidth}
      />
      <CurrentRegionBracket
        chromosome={chromosome}
        currentRegion={currentRegion}
        extentEnd={renderedChromosomeLength}
        extentStart={0}
        height={renderedHeight}
        width={renderedWidth}
      />
    </svg>
  );
}
