import { ReactElement, ReactNode } from "react"; 
import { SvgIconOwnProps } from "@mui/material";
import { RowInfo } from "../types";

interface BaseTableProps {
  toolbarSlot?: ReactNode
  /**
   * If anything besides an element, renders tooltip icon to the right of the table label with specified string as tooltip contents.
   * If an element, renders the element to the right of the table label.
   */
  labelTooltip?: ReactNode
  /**
   * Styling object for the toolbar
   */
  toolbarStyle?: React.CSSProperties;
  /**
   * Color passed as `htmlColor` to columns, filter, download and search icons
   */
  toolbarIconColor?: SvgIconOwnProps["htmlColor"]
}

type DataGridWrapperProps = {
  rows: RowInfo[];
  selectedIds: Set<string>;
  setSelected: (ids: Set<string>) => void;
  setActive: () => void;
  sortedAssay: boolean;
};

//This enforces that a downloadFileName is specified if a ReactElement is used as the label (no default )
export type DataGridProps = DataGridWrapperProps & BaseTableProps & (
  | { label?: string; downloadFileName?: string }
  | { label: ReactElement; downloadFileName: string }
  | { label?: undefined; downloadFileName?: string }
);