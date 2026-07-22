import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import type { ValueMarkerConfig } from "./catalogColumns";

export function DataGridCellValue({ value }: { value: unknown }) {
  const text = String(value ?? "");

  return (
    <Tooltip title={text} enterDelay={500} placement="top-start">
      <Box
        component="span"
        sx={{
          display: "block",
          flex: 1,
          minWidth: 0,
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </Box>
    </Tooltip>
  );
}

export function ValueMarkerCell({
  value,
  marker,
}: {
  value: unknown;
  marker: ValueMarkerConfig | undefined;
}) {
  if (!marker) return <DataGridCellValue value={value} />;

  return (
    <Box
      component="span"
      sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, width: "100%" }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 10, height: 10, flex: "0 0 auto", backgroundColor: marker.color }}
      />
      <DataGridCellValue value={value} />
    </Box>
  );
}
