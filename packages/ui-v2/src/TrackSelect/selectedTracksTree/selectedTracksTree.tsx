import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { useMemo } from "react";
import type { SelectedByCatalog } from "../catalog/catalogSelection";
import { getActiveView } from "../catalog/catalogViews";
import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { buildSelectedTree } from "./buildSelectedTree";
import { SelectedTreeItem } from "./selectedTreeItem";

type SelectedTracksTreeProps = {
  trackCatalogs: TrackSelectCatalog[];
  selectedByCatalog: SelectedByCatalog;
  activeViewIdByCatalog: Map<string, string>;
  selectedCount: number;
  onRemoveTrackIds: (trackIds: string[]) => void;
};

export function SelectedTracksTree({
  trackCatalogs,
  selectedByCatalog,
  activeViewIdByCatalog,
  selectedCount,
  onRemoveTrackIds,
}: SelectedTracksTreeProps) {
  const trees = useMemo(
    () =>
      trackCatalogs.flatMap((catalog) => {
        const selectedIds = selectedByCatalog.get(catalog.id) ?? new Set<string>();
        const view = getActiveView(catalog, activeViewIdByCatalog);
        const tree = buildSelectedTree({ catalog, view, selectedIds });
        return tree ? [tree] : [];
      }),
    [activeViewIdByCatalog, selectedByCatalog, trackCatalogs],
  );
  return (
    <Paper
      sx={{
        height: trackSelectPanelHeight,
        width: "100%",
        border: "10px solid",
        borderColor: "grey.200",
        boxSizing: "border-box",
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1,
          backgroundColor: "grey.200",
          flexShrink: 0,
        }}
      >
        <Avatar
          sx={{
            width: 30,
            height: 30,
            fontSize: 14,
            fontWeight: "bold",
            bgcolor: "white",
            color: "text.primary",
          }}
        >
          {selectedCount}
        </Avatar>
        <Typography fontWeight="bold">Active Tracks</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
        {trees.length > 0 ? (
          <SimpleTreeView itemChildrenIndentation={12}>
            {trees.map((tree) => (
              <SelectedTreeItem key={tree.id} node={tree} onRemove={onRemoveTrackIds} />
            ))}
          </SimpleTreeView>
        ) : (
          <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
            No selected tracks.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
