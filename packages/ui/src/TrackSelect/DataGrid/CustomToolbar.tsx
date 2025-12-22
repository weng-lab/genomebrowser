import * as React from "react";
import {
  Toolbar,
  ToolbarButton,
  ColumnsPanelTrigger,
  FilterPanelTrigger,
  ExportCsv,
  ExportPrint,
  GridToolbarProps,
  ToolbarPropsOverrides,
  ExportExcel,
} from "@mui/x-data-grid-premium";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import Badge from "@mui/material/Badge";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FilterListIcon from "@mui/icons-material/FilterList";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { DataGridProps } from "../types";
import { InfoOutline } from "@mui/icons-material";

type CustomToolbarProps = {
  label: DataGridProps["label"];
  downloadFileName: DataGridProps["downloadFileName"];
  labelTooltip: DataGridProps["labelTooltip"];
  toolbarSlot?: DataGridProps["toolbarSlot"];
  toolbarStyle?: DataGridProps["toolbarStyle"];
  toolbarIconColor?: DataGridProps["toolbarIconColor"];
} & GridToolbarProps &
  ToolbarPropsOverrides;

export function CustomToolbar({
  label,
  downloadFileName,
  labelTooltip,
  toolbarSlot,
  toolbarStyle,
  toolbarIconColor,
  ...restToolbarProps
}: CustomToolbarProps) {
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const exportMenuTriggerRef = React.useRef<HTMLButtonElement>(null);

  const iconColor = toolbarIconColor ?? "inherit";

  return (
    <Toolbar style={{ ...toolbarStyle }}>
      {typeof label !== "string" && label}
      <Typography
        fontWeight="medium"
        sx={{ flex: 1, mx: 0.5, display: "flex", alignItems: "center", gap: 1 }}
      >
        {typeof label === "string" && label}
        {/* ReactNode can be more than just an element, string, or number but not accounting for that for simplicity */}
        {labelTooltip &&
        (typeof labelTooltip === "string" ||
          typeof labelTooltip === "number") ? (
          <Tooltip title={labelTooltip}>
            <InfoOutline fontSize="inherit" color="primary" />
          </Tooltip>
        ) : (
          labelTooltip
        )}
      </Typography>
      {toolbarSlot && (
        <>
          {toolbarSlot}
          <Divider
            orientation="vertical"
            variant="middle"
            flexItem
            sx={{ mx: 0.5 }}
          />
        </>
      )}

      <Tooltip title="Columns">
        <ColumnsPanelTrigger render={<ToolbarButton />}>
          <ViewColumnIcon fontSize="small" htmlColor={iconColor} />
        </ColumnsPanelTrigger>
      </Tooltip>

      <Tooltip title="Filters">
        <FilterPanelTrigger
          render={(props, state) => (
            <ToolbarButton {...props} color="default">
              <Badge
                badgeContent={state.filterCount}
                color="primary"
                variant="dot"
              >
                <FilterListIcon fontSize="small" htmlColor={iconColor} />
              </Badge>
            </ToolbarButton>
          )}
        />
      </Tooltip>
      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        sx={{ mx: 0.5 }}
      />
      <Tooltip title="Export">
        <ToolbarButton
          ref={exportMenuTriggerRef}
          id="export-menu-trigger"
          aria-controls="export-menu"
          aria-haspopup="true"
          aria-expanded={exportMenuOpen ? "true" : undefined}
          onClick={() => setExportMenuOpen(true)}
        >
          <FileDownloadIcon fontSize="small" htmlColor={iconColor} />
        </ToolbarButton>
      </Tooltip>

      <Menu
        id="export-menu"
        anchorEl={exportMenuTriggerRef.current}
        open={exportMenuOpen}
        onClose={() => setExportMenuOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          list: {
            "aria-labelledby": "export-menu-trigger",
          },
        }}
      >
        <ExportPrint
          options={{ ...restToolbarProps.printOptions }}
          render={<MenuItem />}
          onClick={() => setExportMenuOpen(false)}
        >
          Print
        </ExportPrint>
        <ExportCsv
          options={{
            fileName: typeof label === "string" ? label : downloadFileName,
            ...restToolbarProps.csvOptions,
          }}
          render={<MenuItem />}
          onClick={() => setExportMenuOpen(false)}
        >
          Download as CSV
        </ExportCsv>
        <ExportExcel
          options={{ ...restToolbarProps.excelOptions }}
          render={<MenuItem />}
          onClick={() => setExportMenuOpen(false)}
        >
          Download as Excel
        </ExportExcel>
      </Menu>
    </Toolbar>
  );
}
