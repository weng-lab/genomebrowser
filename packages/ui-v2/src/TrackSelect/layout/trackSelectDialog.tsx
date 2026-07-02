import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { useState } from "react";
import type { SelectedByFolder } from "../catalog/catalogSelection";
import type { TrackSelectFolder, TrackSelectView } from "../schema/folderSchema";
import type { TrackSelectScreen } from "../types";
import { TrackSelectBody } from "./trackSelectBody";
import { TrackSelectConfirmDialogs } from "./trackSelectConfirmDialogs";
import { TrackSelectFooter } from "./trackSelectFooter";
import { TrackSelectHeader } from "./trackSelectHeader";
import { TrackSelectToolbar } from "./trackSelectToolbar";

type TrackSelectDialogProps = {
  open: boolean;
  title: string;
  folders: TrackSelectFolder[];
  screen: TrackSelectScreen;
  activeFolder: TrackSelectFolder | undefined;
  activeView: TrackSelectView | undefined;
  activeViewIdByFolder: Map<string, string>;
  selectedByFolder: SelectedByFolder;
  selectedTrackCount: number;
  maxTracks: number;
  limitDialogOpen: boolean;
  submitError: string | undefined;
  onClose: () => void;
  onFolderSelect: (folderId: string) => void;
  onBackToFolders: () => void;
  onViewSelect: (viewId: string) => void;
  onActiveFolderSelectionChange: (selectedIds: Set<string>) => void;
  onRemoveTrackIds: (trackIds: string[]) => void;
  onClearSelection: () => void;
  onResetSelection: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onLimitDialogClose: () => void;
};

export function TrackSelectDialog({
  open,
  title,
  folders,
  screen,
  activeFolder,
  activeView,
  activeViewIdByFolder,
  selectedByFolder,
  selectedTrackCount,
  maxTracks,
  limitDialogOpen,
  submitError,
  onClose,
  onFolderSelect,
  onBackToFolders,
  onViewSelect,
  onActiveFolderSelectionChange,
  onRemoveTrackIds,
  onClearSelection,
  onResetSelection,
  onCancel,
  onSubmit,
  onLimitDialogClose,
}: TrackSelectDialogProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <TrackSelectHeader title={title} onClose={onClose} />
      <DialogContent sx={{ marginTop: "5px" }}>
        <Box sx={{ flex: 1, pt: 1 }}>
          <TrackSelectToolbar
            folders={folders}
            screen={screen}
            activeFolder={activeFolder}
            activeView={activeView}
            onBackToFolders={onBackToFolders}
            onViewSelect={onViewSelect}
          />
          <TrackSelectBody
            folders={folders}
            screen={screen}
            activeFolder={activeFolder}
            activeView={activeView}
            activeViewIdByFolder={activeViewIdByFolder}
            selectedByFolder={selectedByFolder}
            selectedTrackCount={selectedTrackCount}
            onFolderSelect={onFolderSelect}
            onActiveFolderSelectionChange={onActiveFolderSelectionChange}
            onRemoveTrackIds={onRemoveTrackIds}
          />
          {submitError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          ) : null}
          <TrackSelectFooter
            onClear={() => setClearDialogOpen(true)}
            onReset={() => setResetDialogOpen(true)}
            onCancel={onCancel}
            onSubmit={onSubmit}
          />
        </Box>
        <TrackSelectConfirmDialogs
          clearDialogOpen={clearDialogOpen}
          resetDialogOpen={resetDialogOpen}
          limitDialogOpen={limitDialogOpen}
          clearAll={screen === "folder-list"}
          folderLabel={activeFolder?.label ?? "tracks"}
          maxTracks={maxTracks}
          onClearDialogClose={() => setClearDialogOpen(false)}
          onResetDialogClose={() => setResetDialogOpen(false)}
          onLimitDialogClose={onLimitDialogClose}
          onClearSelection={onClearSelection}
          onResetSelection={onResetSelection}
        />
      </DialogContent>
    </Dialog>
  );
}
