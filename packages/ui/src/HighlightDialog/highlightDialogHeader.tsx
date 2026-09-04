import CloseIcon from "@mui/icons-material/Close";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";

export function HighlightDialogHeader({ onClose }: { onClose: () => void }) {
  return (
    <DialogTitle
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
      Current Highlights
      <IconButton
        aria-label="Close highlights"
        onClick={onClose}
        sx={{ color: "primary.contrastText" }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  );
}
