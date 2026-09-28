import type { ReactNode } from "react";
import { Button, Divider, Stack, Tooltip } from "@mui/material";
import HighlightIcon from "@mui/icons-material/Highlight";
import LayersIcon from "@mui/icons-material/Layers";
import SortIcon from "@mui/icons-material/Sort";
import { LabeledGroup } from "../LabeledGroup/labeledGroup";

export type ManagementControlsProps = {
  onManageHighlights?: () => void;
  onSelectTracks?: () => void;
  onSortTracks?: () => void;
  managementActions?: ReactNode;
};

export function ManagementControls({
  onManageHighlights,
  onSelectTracks,
  onSortTracks,
  managementActions,
}: ManagementControlsProps) {
  if (!onManageHighlights && !onSelectTracks && !onSortTracks && !managementActions) return null;
  return (
    <LabeledGroup title="Manage">
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        divider={<Divider orientation="vertical" flexItem aria-hidden="true" />}
      >
        {onManageHighlights ? (
          <Tooltip title="Click to manage highlights" describeChild>
            <Button
              size="small"
              startIcon={<HighlightIcon fontSize="small" />}
              onClick={onManageHighlights}
            >
              Highlights
            </Button>
          </Tooltip>
        ) : null}
        {onSelectTracks ? (
          <Tooltip title="Click to manage tracks" describeChild>
            <Button
              size="small"
              startIcon={<LayersIcon fontSize="small" />}
              onClick={onSelectTracks}
            >
              Tracks
            </Button>
          </Tooltip>
        ) : null}
        {onSortTracks ? (
          <Tooltip title="Click to sort tracks" describeChild>
            <Button size="small" startIcon={<SortIcon fontSize="small" />} onClick={onSortTracks}>
              Sort
            </Button>
          </Tooltip>
        ) : null}
        {managementActions}
      </Stack>
    </LabeledGroup>
  );
}
