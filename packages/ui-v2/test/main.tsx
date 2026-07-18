import { createRoot } from "react-dom/client";
import { useState } from "react";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import "./muiLicense";

import {
  bigBedModule,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  methylCModule,
  transcriptModule,
} from "@weng-lab/genomebrowser-v2";
import { TrackSelect, withValueMarkers } from "../src/lib";

// catalogs
import biosamples from "./catalogs/human-biosamples.json";
import psychscreenTracks from "./catalogs/psychscreen.json";

const useBrowserStore = createBrowserStore({
  region: "chr6:21,592,778-21,599,592",
  marginWidth: 55,
  trackWidth: 1445,
});

const modules = [bigWigModule, bigBedModule, methylCModule, transcriptModule];
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

const assayColors = {
  DNase: "#06da93",
  ATAC: "#02c7b9",
  H3K4me3: "#ff2020",
  ChromHMM: "#0097a7",
  H3K27ac: "#fdc401",
  CTCF: "#01a6f1",
  cCRE: "#000000",
  "RNA-seq": "#00aa00",
  WGBS: "#648bd8",
};

function Main() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Stack>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Open
        </Button>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </Stack>
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCatalogs={[biosamples, psychscreenTracks]}
        useTrackStore={useTrackStore}
        defaultTrackIds={[
          "human-biosamples::human-biosamples/ccre-aggregate",
          "human-psychscreen::human-psychscreen/epigenetic/adult-bcres",
        ]}
        columnOverrides={{
          "human-biosamples": {
            assay: withValueMarkers(assayColors),
          },
        }}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
