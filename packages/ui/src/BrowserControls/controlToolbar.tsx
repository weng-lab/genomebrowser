import { styled, type CSSInterpolation } from "@mui/material/styles";
import { RegionControls, type RegionControlsProps } from "./regionControls";
import { NavigationControls, type NavigationControlsProps } from "./navigationControls";
import { InteractionControls } from "./interactionControls";
import { ManagementControls, type ManagementControlsProps } from "./managementControls";

export type ControlToolbarProps = RegionControlsProps &
  ManagementControlsProps &
  NavigationControlsProps;

declare module "@mui/material/styles" {
  interface Components<Theme = unknown> {
    /** Theme styles for `ControlToolbar`. `root` is the row that holds the sections. */
    GbControlToolbar?: {
      styleOverrides?: {
        root?: CSSInterpolation | ((props: { theme: Theme }) => CSSInterpolation);
      };
    };
  }
}

// A named slot lets the host theme restyle the row, such as centering wrapped sections.
const Root = styled("div", { name: "GbControlToolbar", slot: "Root" })(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: theme.spacing(1),
}));

export function ControlToolbar({
  browserStore,
  search,
  onManageHighlights,
  onSelectTracks,
  onSortTracks,
  onDownloadImage,
  navigationActions,
  managementActions,
}: ControlToolbarProps) {
  return (
    <Root aria-label="Genome browser controls" role="group">
      <RegionControls browserStore={browserStore} search={search} />
      <NavigationControls browserStore={browserStore} navigationActions={navigationActions} />
      <InteractionControls browserStore={browserStore} />
      <ManagementControls
        onManageHighlights={onManageHighlights}
        onSelectTracks={onSelectTracks}
        onSortTracks={onSortTracks}
        onDownloadImage={onDownloadImage}
        managementActions={managementActions}
      />
    </Root>
  );
}
