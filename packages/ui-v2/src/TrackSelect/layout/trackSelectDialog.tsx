import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import type { ReactNode } from "react";
import { TrackSelectHeader } from "./trackSelectHeader";

type TrackSelectDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function TrackSelectDialog({
  open,
  title,
  onClose,
  children,
}: TrackSelectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <TrackSelectHeader title={title} onClose={onClose} />
      <DialogContent sx={{ mt: 1 }}>
        <Box sx={{ flex: 1, pt: 1 }}>
          {children}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
