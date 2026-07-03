import { createRoot } from "react-dom/client";
import { useState } from "react";
import catalog from "./tracks.json";
import secondaryCatalog from "./tracks-secondary.json";
import { TrackSelect } from "../src/lib";
import { bigBedModule, bigWigModule, createTrackStore } from "@weng-lab/genomebrowser-v2";
import Button from "@mui/material/Button";

const useTrackStore = createTrackStore({
  modules: [bigWigModule, bigBedModule],
  tracks: [],
});

function Main() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open
      </Button>
      <TrackList />
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCatalogs={[catalog, secondaryCatalog]}
        useTrackStore={useTrackStore}
      />
    </>
  );
}

function TrackList() {
  const tracks = useTrackStore((state) => state.tracks);
  return (
    <>
      {tracks.map((track) => {
        return <div key={track.base.id}>{track.base.title}</div>;
      })}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
