import { Box } from "@mui/material";
import { ASSAY_COLORS } from "./constants";

/**
 * Creates the assay icon for DataGrid and RichTreeView
 * @param type: assay type
 * @returns an icon of the assay's respective color
 */
export function AssayIcon(type: string) {
  const color = ASSAY_COLORS[type];
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "20%",
        bgcolor: color,
      }}
    />
  );
}
