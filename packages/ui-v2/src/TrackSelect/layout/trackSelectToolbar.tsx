import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectToolbar() {
  const { state, actions } = useTrackSelect();
  const { trackCatalogs, screen, activeCatalog, activeView } = state;

  function handleViewChange(event: SelectChangeEvent) {
    actions.selectView(event.target.value);
  }

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      {screen === "catalog-detail" && trackCatalogs.length > 1 ? (
        <Button size="small" onClick={actions.backToCatalogs}>
          Back to Catalogs
        </Button>
      ) : (
        <Box />
      )}
      {screen === "catalog-detail" && activeCatalog && activeView ? (
        <Select
          size="small"
          value={activeView.id}
          onChange={handleViewChange}
          sx={{ minWidth: 180 }}
        >
          {activeCatalog.views.map((view) => (
            <MenuItem key={view.id} value={view.id}>
              {view.label}
            </MenuItem>
          ))}
        </Select>
      ) : null}
    </Box>
  );
}
