import { DataGridPremiumProps } from "@mui/x-data-grid-premium";
import { ReactElement, ReactNode } from "react"; 
import { SvgIconOwnProps } from "@mui/material";

//The props listed here are the props which are new (like elevation) or overridden (like pageSizeOptions) compared to the MUI DataGridProProps

interface BaseTableProps extends Omit<DataGridPremiumProps, 'label'> {
  /**
   * Rows to be consumed in the table.
   * 
   * ```undefined``` will be given default value of ```[]```
   * 
   * Note: Rows without an 'id' property will be given id matching their index
   */
  rows: DataGridPremiumProps["rows"];
  /**
   * @default true
   * @note Overrides MUI default
   */
  disableRowSelectionOnClick?: DataGridPremiumProps["disableRowSelectionOnClick"];
  /**
   * @default "compact"
   * @note Overrides MUI default
   */
  density?: DataGridPremiumProps["density"];
  /**
   * @default true
   * @note Overrides MUI default
   */
  autosizeOnMount?: boolean;
  /**
   * @note Table assigns a default internal ID to each row if no ID is provided in the row data.
   */
  getRowId?: DataGridPremiumProps["getRowId"];
  /**
   * Element to be rendered instead of `DataGridPro` when `rows` has a length of `0`.
   * If a string is passed will use `TableFallback` component
   */
  emptyTableFallback?: string | ReactElement;
  /**
   * If true, the toolbar is displayed.
   * @default true
   */
  showToolbar?: DataGridPremiumProps["showToolbar"]
  /**
   * Configures the height properties of the wrapper `<div>`. 
   * 
   * By default it's wrapped with:
   * ```jsx
   * <div style={{ display: 'flex', flexDirection: 'column' }}>
   * ```
   * 
   * Additional height properties spread onto this `<div>`
   */
  divHeight?: {
    height?: string | number
    minHeight?: string | number
    maxHeight?: string | number
  }
  /**
   * Used for failed fetches. If true will display error fallback
   * @default false
   */
  error?: boolean
  /**
   * Slot for extra component to be rendered within the toolbar, to the left of the filters
   */
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

//This enforces that a downloadFileName is specified if a ReactElement is used as the label (no default )
export type TableProps = BaseTableProps & (
  | { label?: string; downloadFileName?: string }
  | { label: ReactElement; downloadFileName: string }
  | { label?: undefined; downloadFileName?: string }
);