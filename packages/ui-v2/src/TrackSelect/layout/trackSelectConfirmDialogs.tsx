import { ClearDialog } from "../dialogs/clearDialog";
import { LimitDialog } from "../dialogs/limitDialog";
import { ResetDialog } from "../dialogs/resetDialog";

type TrackSelectConfirmDialogsProps = {
  clearDialogOpen: boolean;
  resetDialogOpen: boolean;
  limitDialogOpen: boolean;
  clearAll: boolean;
  folderLabel: string;
  maxTracks: number;
  onClearDialogClose: () => void;
  onResetDialogClose: () => void;
  onLimitDialogClose: () => void;
  onClearSelection: () => void;
  onResetSelection: () => void;
};

export function TrackSelectConfirmDialogs({
  clearDialogOpen,
  resetDialogOpen,
  limitDialogOpen,
  clearAll,
  folderLabel,
  maxTracks,
  onClearDialogClose,
  onResetDialogClose,
  onLimitDialogClose,
  onClearSelection,
  onResetSelection,
}: TrackSelectConfirmDialogsProps) {
  return (
    <>
      <ClearDialog
        open={clearDialogOpen}
        onClose={onClearDialogClose}
        onConfirm={() => {
          onClearSelection();
          onClearDialogClose();
        }}
        folderLabel={folderLabel}
        clearAll={clearAll}
      />
      <ResetDialog
        open={resetDialogOpen}
        onClose={onResetDialogClose}
        onConfirm={() => {
          onResetSelection();
          onResetDialogClose();
        }}
      />
      <LimitDialog
        open={limitDialogOpen}
        maxTracks={maxTracks}
        onClose={onLimitDialogClose}
      />
    </>
  );
}
