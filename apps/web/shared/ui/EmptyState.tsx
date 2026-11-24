import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  /** What to do to fill the space, in a sentence or two. */
  description?: ReactNode;
};

/**
 * A dashed placeholder, with a title and what to do, where a list or section has nothing yet.
 * For a line of status while content loads or after it fails to, use `StatusMessage`.
 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 3,
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        borderRadius: 1,
        textAlign: "center",
      }}
    >
      <Typography variant="subtitle1" component="p" sx={{ fontWeight: "fontWeightMedium" }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
  );
}
