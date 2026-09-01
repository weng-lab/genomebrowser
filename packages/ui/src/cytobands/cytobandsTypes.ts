import type { GenomicRegion, Highlight } from "@weng-lab/genomebrowser";
import type { Cytoband } from "@weng-lab/genomic-reader";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

export type CytobandColors = {
  negative: string;
  positive: string;
  variable: string;
  stalk: string;
  centromere: string;
  unknown: string;
};

export type CytobandsProps = {
  chromosome: string;
  chromosomeLength: number;
  bands: readonly Cytoband[];
  width: number;
  height: number;
  colors?: Partial<CytobandColors>;
  highlights?: readonly Highlight[];
  currentRegion?: GenomicRegion;
  renderHighlightTooltip?: (highlight: Highlight) => ReactNode;
  onHighlightClick?: (
    highlight: Highlight,
    event: ReactMouseEvent<SVGGElement> | ReactKeyboardEvent<SVGGElement>,
  ) => void;
  onHighlightPointerEnter?: (highlight: Highlight, event: ReactPointerEvent<SVGGElement>) => void;
  onHighlightPointerLeave?: (highlight: Highlight, event: ReactPointerEvent<SVGGElement>) => void;
};
