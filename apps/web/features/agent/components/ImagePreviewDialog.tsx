"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { saveBrowserImage, type BrowserImage } from "@weng-lab/genomebrowser";

/**
 * Shows an image an agent exported. Nothing is saved until the user selects Download.
 * `onExited` runs once the dialog has finished closing, so the image can be released.
 */
export function ImagePreviewDialog({
  image,
  open,
  onClose,
  onExited,
}: {
  image: BrowserImage | null;
  open: boolean;
  onClose: () => void;
  onExited: () => void;
}) {
  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open && image !== null}
      onClose={onClose}
      aria-labelledby="agent-image-preview-title"
      slotProps={{ paper: { sx: { borderRadius: 1.5 } }, transition: { onExited } }}
    >
      <DialogTitle
        id="agent-image-preview-title"
        sx={{
          alignItems: "center",
          bgcolor: "primary.dark",
          color: "primary.contrastText",
          display: "flex",
          fontWeight: 700,
          justifyContent: "space-between",
          py: 1.25,
          pr: 1,
        }}
      >
        Exported image
        <IconButton
          aria-label="Close image preview"
          onClick={onClose}
          sx={{ color: "primary.contrastText" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {image && (
        <>
          <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1, pb: 1.5 }}>
              The agent prepared this image. Download it to keep a copy.
            </Typography>
            <Box
              sx={{
                maxHeight: "60vh",
                overflow: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "#ffffff",
              }}
            >
              <PreviewImage blob={image.blob} />
            </Box>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ pt: 1 }}>
              {image.filename} · {image.format.toUpperCase()} · {image.width.toLocaleString()} ×{" "}
              {image.height.toLocaleString()} px · {formatBytes(image.blob.size)}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
            <Button onClick={onClose}>Close</Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => {
                saveBrowserImage(image);
                onClose();
              }}
            >
              Download {image.format.toUpperCase()}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

// Each mount gets its own object URL, revoked when the image changes or unmounts.
function PreviewImage({ blob }: { blob: Blob }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return (
    <Box
      component="img"
      ref={ref}
      alt="Preview of the exported genome browser image"
      sx={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
