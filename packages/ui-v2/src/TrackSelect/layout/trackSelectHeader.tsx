import CloseIcon from "@mui/icons-material/Close";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";

type TrackSelectHeaderProps = {
  title: string;
  onClose: () => void;
};

export function TrackSelectHeader({ title, onClose }: TrackSelectHeaderProps) {
  return (
    <DialogTitle
      sx={{
        bgcolor: "primary.main",
        color: "primary.contrastText",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "bold",
      }}
    >
      {title}
      <IconButton
        size="large"
        onClick={onClose}
        sx={{ color: "primary.contrastText", p: 0 }}
      >
        <CloseIcon fontSize="large" />
      </IconButton>
    </DialogTitle>
  );
}
