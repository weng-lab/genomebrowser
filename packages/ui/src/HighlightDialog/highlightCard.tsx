import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { GenomicRegion, Highlight } from "@weng-lab/genomebrowser";
import { formatRegion } from "./highlightRegion";

type HighlightCardProps = {
  highlight: Highlight;
  region: GenomicRegion;
  onNavigate: () => void;
  onRemove: () => void;
};

export function HighlightCard({ highlight, region, onNavigate, onRemove }: HighlightCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        alignItems: "center",
        bgcolor: "action.hover",
        borderRadius: 2,
        borderLeft: 4,
        borderLeftColor: highlight.color,
        display: "flex",
        gap: 1.5,
        justifyContent: "space-between",
        pl: 1.25,
        pr: 0.75,
        py: 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography fontWeight={600} noWrap variant="body2">
          {highlight.id}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {formatRegion(region)}
        </Typography>
      </Box>
      <Box sx={{ alignItems: "center", display: "flex", flex: "0 0 auto", gap: 0.25 }}>
        <Tooltip title="Go to highlight">
          <IconButton aria-label={`Go to ${highlight.id}`} onClick={onNavigate} size="small">
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove highlight">
          <IconButton
            aria-label={`Remove ${highlight.id}`}
            onClick={onRemove}
            size="small"
            sx={{ color: "error.main" }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
