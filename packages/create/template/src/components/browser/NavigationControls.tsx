import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, Tooltip } from "@mui/material";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";
import { useBrowserStore } from "../../stores";

export default function NavigationControls() {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
      <Box aria-label="Pan" role="group" sx={{ display: "flex", flexShrink: 0, gap: 1 }}>
        <Tooltip title="Pan left by half a viewport">
          <Box component="span" sx={{ display: "inline-flex" }}>
            <BrowserNavigationButton
              action={{ type: "pan", fraction: -0.5 }}
              aria-label="Pan left by half a viewport"
              browserStore={useBrowserStore}
              size="small"
              sx={{ borderRadius: 1.5, minHeight: 40, minWidth: 44, padding: 0 }}
              variant="outlined"
            >
              <ArrowBackIcon fontSize="small" />
            </BrowserNavigationButton>
          </Box>
        </Tooltip>
        <Tooltip title="Pan right by half a viewport">
          <Box component="span" sx={{ display: "inline-flex" }}>
            <BrowserNavigationButton
              action={{ type: "pan", fraction: 0.5 }}
              aria-label="Pan right by half a viewport"
              browserStore={useBrowserStore}
              size="small"
              sx={{ borderRadius: 1.5, minHeight: 40, minWidth: 44, padding: 0 }}
              variant="outlined"
            >
              <ArrowForwardIcon fontSize="small" />
            </BrowserNavigationButton>
          </Box>
        </Tooltip>
      </Box>
      <Box aria-label="Zoom" role="group" sx={{ display: "flex", flexShrink: 0, gap: 1 }}>
        <Tooltip title="Zoom out 2×">
          <Box component="span" sx={{ display: "inline-flex" }}>
            <BrowserNavigationButton
              action={{ type: "zoom", factor: 2 }}
              aria-label="Zoom out 2×"
              browserStore={useBrowserStore}
              size="small"
              sx={{ borderRadius: 1.5, minHeight: 40, minWidth: 44, padding: 0 }}
              variant="outlined"
            >
              <RemoveIcon fontSize="small" />
            </BrowserNavigationButton>
          </Box>
        </Tooltip>
        <Tooltip title="Zoom in 2×">
          <Box component="span" sx={{ display: "inline-flex" }}>
            <BrowserNavigationButton
              action={{ type: "zoom", factor: 0.5 }}
              aria-label="Zoom in 2×"
              browserStore={useBrowserStore}
              size="small"
              sx={{ borderRadius: 1.5, minHeight: 40, minWidth: 44, padding: 0 }}
              variant="outlined"
            >
              <AddIcon fontSize="small" />
            </BrowserNavigationButton>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
