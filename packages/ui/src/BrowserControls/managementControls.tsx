import type { ReactNode } from "react";
import { Divider, IconButton, Stack, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import HighlightIcon from "@mui/icons-material/Highlight";
import LayersIcon from "@mui/icons-material/Layers";
import SortIcon from "@mui/icons-material/Sort";
import { LabeledGroup } from "../LabeledGroup/labeledGroup";

export type ManagementControlsProps = {
  onManageHighlights?: () => void;
  onSelectTracks?: () => void;
  onSortTracks?: () => void;
  onDownloadImage?: () => void;
  managementActions?: ReactNode;
};

export function ManagementControls({
  onManageHighlights,
  onSelectTracks,
  onSortTracks,
  onDownloadImage,
  managementActions,
}: ManagementControlsProps) {
  const actions = [
    { onClick: onManageHighlights, label: "Manage highlights", icon: <HighlightIcon /> },
    { onClick: onSelectTracks, label: "Manage tracks", icon: <LayersIcon /> },
    { onClick: onSortTracks, label: "Sort tracks", icon: <SortIcon /> },
    { onClick: onDownloadImage, label: "Download image", icon: <DownloadIcon /> },
  ].filter((action) => action.onClick);
  if (!actions.length && !managementActions) return null;
  return (
    <LabeledGroup title="Manage">
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        divider={
          managementActions ? <Divider orientation="vertical" flexItem aria-hidden="true" /> : null
        }
      >
        {actions.length > 0 && (
          <Stack direction="row" spacing={0.5}>
            {actions.map(({ onClick, label, icon }) => (
              <Tooltip key={label} title={label} describeChild>
                <IconButton
                  aria-label={label}
                  size="small"
                  sx={{ width: 32, height: 32, "& svg": { fontSize: 20 } }}
                  onClick={onClick}
                >
                  {icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        )}
        {managementActions}
      </Stack>
    </LabeledGroup>
  );
}
