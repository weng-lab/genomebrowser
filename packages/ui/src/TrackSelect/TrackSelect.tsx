import { useState } from "react";
import {
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Button,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Track, TrackStoreInstance } from "@weng-lab/genomebrowser";

// import CloseIcon from "@mui/icons-material/Close";

export default function TrackSelect({
  trackStore,
}: {
  trackStore: TrackStoreInstance;
}) {
  const [open, setOpen] = useState(true);

  const activeTracks = trackStore((state) => state.tracks);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Track Management
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setOpen(false)}
            size="small"
          >
            Close
          </Button>
        </Toolbar>
      </AppBar>
      <Box display="flex" flexDirection="row" sx={{ p: 2 }} gap={2}>
        <ActiveTracks activeTracks={activeTracks} />
        <Paper
          sx={{
            width: "50%",
          }}
        >
          <Typography variant="h6">Available Tracks</Typography>
        </Paper>
      </Box>
      <AppBar position="static" sx={{ top: "auto", bottom: 0 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button variant="contained" color="secondary" size="small">
            Clear all selections
          </Button>
          <Button variant="contained" color="primary" size="small">
            Apply
          </Button>
        </Toolbar>
      </AppBar>
    </Dialog>
  );
}

function ActiveTracks({ activeTracks }: { activeTracks: Track[] }) {
  return (
    <Paper sx={{ width: "50%" }}>
      <Typography variant="h6">Active Tracks</Typography>
      <List>
        {activeTracks.map((track) => (
          <ListItem key={track.id}>
            <ListItemText primary={track.title} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
