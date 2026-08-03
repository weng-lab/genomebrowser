import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectToolbar() {
  const { state, actions } = useTrackSelect();
  const { trackCollections, screen, activeCollection, activeView } = state;

  function handleViewChange(event: SelectChangeEvent) {
    actions.selectView(event.target.value);
  }

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      {screen === "collection-detail" && trackCollections.length > 1 ? (
        <Button size="small" onClick={actions.backToCollections}>
          Back to Collections
        </Button>
      ) : (
        <Box />
      )}
      {screen === "collection-detail" && activeCollection && activeView ? (
        <Select
          size="small"
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
