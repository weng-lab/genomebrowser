import { Box } from "@mui/material";
import CurrentRegion from "./CurrentRegion";
import HighlightsButton from "./HighlightsButton";
import NavigationControls from "./NavigationControls";
import RegionSearch from "./RegionSearch";
import TrackPicker from "./TrackPicker";

export default function BrowserControls() {
  return (
    <Box
      aria-label="Browser controls"
      role="group"
      sx={{
        alignItems: "center",
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      <Box sx={{ gridColumn: { sm: "1 / -1", md: "auto" }, minWidth: 0 }}>
        <RegionSearch />
      </Box>
      <Box
        sx={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 1,
          minWidth: 0,
        }}
      >
        <CurrentRegion />
        <NavigationControls />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: { xs: "center", sm: "flex-end" },
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <HighlightsButton />
        <TrackPicker />
      </Box>
    </Box>
  );
}
