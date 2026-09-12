import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectToolbar() {
  const { state, actions } = useTrackSelect();
  const { collections, screen, activeCollection, activeView } = state;

  function handleViewChange(event: SelectChangeEvent) {
    actions.selectView(event.target.value);
  }

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2, gap: 1, flexWrap: "wrap" }}
    >
      {screen === "collection-detail" && collections.length > 1 ? (
        <Button size="small" onClick={actions.backToCollections}>
          Back to Collections
        </Button>
      ) : (
        <Box />
      )}
      {screen === "collection-detail" && activeCollection ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mx: { xs: 0, sm: 2 },
            flex: { xs: "1 1 100%", sm: 1 },
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {activeCollection.label} · {activeCollection.assembly}
        </Typography>
      ) : null}
      {screen === "collection-detail" &&
      activeCollection &&
      activeView &&
      activeCollection.views.length > 1 ? (
        <Select
          size="small"
          inputProps={{ "aria-label": "Collection view" }}
          value={activeView.id}
          onChange={handleViewChange}
          sx={{ minWidth: 180 }}
        >
          {activeCollection.views.map((view) => (
            <MenuItem key={view.id} value={view.id}>
              {view.label}
            </MenuItem>
          ))}
        </Select>
      ) : null}
    </Box>
  );
}
