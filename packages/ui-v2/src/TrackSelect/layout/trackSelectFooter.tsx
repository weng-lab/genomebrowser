import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

type TrackSelectFooterProps = {
  onClear: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function TrackSelectFooter({
  onClear,
  onReset,
  onCancel,
  onSubmit,
}: TrackSelectFooterProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mt: 2,
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={onClear}
        >
          Clear
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={onReset}
        >
          Reset
        </Button>
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" size="small" onClick={onSubmit}>
          Submit
        </Button>
      </Box>
    </Box>
  );
}
