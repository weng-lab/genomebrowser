import { createRoot } from "react-dom/client";
import { useState } from "react";
import catalog from "./tracks.json";
import secondaryCatalog from "./tracks-secondary.json";
import psychscreenTracks from "./psychscreen.json";
import { TrackSelect } from "../src/lib";
import {
  bigBedModule,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  transcriptModule,
} from "@weng-lab/genomebrowser-v2";
import Button from "@mui/material/Button";

const useBrowserStore = createBrowserStore({
  region: "chr11:6,192,271-6,680,547",
  marginWidth: 55,
  trackWidth: 1445,
});

const modules = [bigWigModule, bigBedModule, transcriptModule];
const useTrackStore = createTrackStore({
  modules,
  tracks: [
    transcriptModule.create({
      id: "genes",
      title: "GENCODE Genes",
      display: "squish",
      color: "#444444",
      config: {
        assembly: "GRCh38",
        version: 40,
      },
    }),
  ],
});

function Main() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open
      </Button>
      <TrackList />
      <GenomeBrowser
        browserStore={useBrowserStore}
        trackStore={useTrackStore}
      />
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCatalogs={[catalog, secondaryCatalog, psychscreenTracks]}
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
