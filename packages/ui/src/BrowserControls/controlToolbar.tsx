import { Box } from "@mui/material";
import { RegionControls, type RegionControlsProps } from "./regionControls";
import { NavigationControls, type NavigationControlsProps } from "./navigationControls";
import { InteractionControls } from "./interactionControls";
import { ManagementControls, type ManagementControlsProps } from "./managementControls";

export type ControlToolbarProps = RegionControlsProps &
  ManagementControlsProps &
  NavigationControlsProps;

export function ControlToolbar({
  browserStore,
  search,
  onManageHighlights,
  onSelectTracks,
  navigationActions,
  managementActions,
}: ControlToolbarProps) {
  return (
    <Box
      aria-label="Genome browser controls"
      role="group"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      <RegionControls browserStore={browserStore} search={search} />
      <NavigationControls browserStore={browserStore} navigationActions={navigationActions} />
      <InteractionControls browserStore={browserStore} />
      <ManagementControls
        onManageHighlights={onManageHighlights}
        onSelectTracks={onSelectTracks}
        managementActions={managementActions}
      />
    </Box>
  );
}
