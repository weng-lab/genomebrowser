import type { BrowserRegion, Highlight } from "@weng-lab/genomebrowser-v2";
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
  assembly: string;
  chromosome: string;
  width: number;
  height: number;
  endpoint?: string;
  colors?: Partial<CytobandColors>;
  highlights?: readonly Highlight[];
  currentRegion?: BrowserRegion;
  renderHighlightTooltip?: (highlight: Highlight) => ReactNode;
  onHighlightClick?: (
    highlight: Highlight,
    event: ReactMouseEvent<SVGGElement> | ReactKeyboardEvent<SVGGElement>,
  ) => void;
  onHighlightPointerEnter?: (highlight: Highlight, event: ReactPointerEvent<SVGGElement>) => void;
  onHighlightPointerLeave?: (highlight: Highlight, event: ReactPointerEvent<SVGGElement>) => void;
};
