import * as React from "react";
import { styled } from "@mui/material/styles";
import {
  Toolbar,
  ToolbarButton,
  ColumnsPanelTrigger,
  FilterPanelTrigger,
  ExportCsv,
  ExportPrint,
  QuickFilter,
  QuickFilterControl,
  QuickFilterClear,
  QuickFilterTrigger,
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
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import Typography from "@mui/material/Typography";
import { TableProps } from "./types";
import { InfoOutline } from "@mui/icons-material";

type OwnerState = {
  expanded: boolean;
};

const StyledQuickFilter = styled(QuickFilter)({
  display: "grid",
  alignItems: "center",
});

const StyledToolbarButton = styled(ToolbarButton)<{ ownerState: OwnerState }>(({ theme, ownerState }) => ({
  gridArea: "1 / 1",
  width: "min-content",
  height: "min-content",
  zIndex: 1,
  opacity: ownerState.expanded ? 0 : 1,
  pointerEvents: ownerState.expanded ? "none" : "auto",
  transition: theme.transitions.create(["opacity"]),
}));

const StyledTextField = styled(TextField)<{
  ownerState: OwnerState;
}>(({ theme, ownerState }) => ({
  gridArea: "1 / 1",
  overflowX: "clip",
  width: ownerState.expanded ? 260 : "var(--trigger-width)",
  opacity: ownerState.expanded ? 1 : 0,
  transition: theme.transitions.create(["width", "opacity"]),
}));

type CustomToolbarProps = {
  label: TableProps["label"];
  downloadFileName: TableProps["downloadFileName"];
  labelTooltip: TableProps["labelTooltip"];
  toolbarSlot?: TableProps["toolbarSlot"];
  toolbarStyle?: TableProps["toolbarStyle"];
  toolbarIconColor?: TableProps["toolbarIconColor"];
} & GridToolbarProps &
  ToolbarPropsOverrides;

export function CustomToolbar({ label, downloadFileName, labelTooltip, toolbarSlot, toolbarStyle, toolbarIconColor, ...restToolbarProps }: CustomToolbarProps) {
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const exportMenuTriggerRef = React.useRef<HTMLButtonElement>(null);

  const iconColor = toolbarIconColor ?? "inherit"

  return (
    <Toolbar style={{ ...toolbarStyle }}>
      {typeof label !== "string" && label}
      <Typography fontWeight="medium" sx={{ flex: 1, mx: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
        {typeof label === "string" && label}
        {/* ReactNode can be more than just an element, string, or number but not accounting for that for simplicity */}
        {labelTooltip && (typeof labelTooltip === "string" || typeof labelTooltip === "number") ? (
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
          <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 0.5 }} />
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
              <Badge badgeContent={state.filterCount} color="primary" variant="dot">
                <FilterListIcon fontSize="small" htmlColor={iconColor} />
              </Badge>
            </ToolbarButton>
          )}
        />
      </Tooltip>
      <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 0.5 }} />
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
          options={{ fileName: typeof label === "string" ? label : downloadFileName, ...restToolbarProps.csvOptions }}
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

      <StyledQuickFilter>
        <QuickFilterTrigger
          render={(triggerProps, state) => (
            <Tooltip title="Search" enterDelay={0}>
              <StyledToolbarButton
                {...triggerProps}
                ownerState={{ expanded: state.expanded }}
                color="default"
                aria-disabled={state.expanded}
              >
                <SearchIcon fontSize="small" htmlColor={iconColor} />
              </StyledToolbarButton>
            </Tooltip>
          )}
        />
        <QuickFilterControl
          render={({ ref, ...controlProps }, state) => (
            <StyledTextField
              {...controlProps}
              ownerState={{ expanded: state.expanded }}
              inputRef={ref}
              aria-label="Search"
              placeholder="Search..."
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: state.value ? (
                    <InputAdornment position="end">
                      <QuickFilterClear
                        edge="end"
                        size="small"
                        aria-label="Clear search"
                        material={{ sx: { marginRight: -0.75 } }}
                      >
                        <CancelIcon fontSize="small" />
                      </QuickFilterClear>
                    </InputAdornment>
                  ) : null,
                  ...controlProps.slotProps?.input,
                },
                ...controlProps.slotProps,
              }}
            />
          )}
        />
      </StyledQuickFilter>
    </Toolbar>
  );
}