/// <reference types="vite/client" />

// react
import { useState } from "react";
import { createRoot } from "react-dom/client";

import "../src/muiLicense";

// mui
import EditIcon from "@mui/icons-material/Edit";
import { Button } from "@mui/material";

// weng lab
import {
  Browser,
  createBrowserStoreMemo,
  createTrackStoreMemo,
  GQLWrapper,
} from "@weng-lab/genomebrowser";

// local
import {
  foldersByAssembly,
  TrackSelect,
  type TrackSelectTrackContext,
} from "../src/lib";

type Assembly = "GRCh38" | "mm10";

function Main() {
  const [open, setOpen] = useState(false);
  const currentAssembly: Assembly = "GRCh38";

  const browserStore = createBrowserStoreMemo({
    domain: { chromosome: "chr12", start: 53380108, end: 53416378 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const domain = browserStore((s) => s.domain);

  const folders = foldersByAssembly[currentAssembly];

  const initialSelection =
    currentAssembly === "GRCh38"
      ? defaultHumanSelections
      : defaultMouseSelections;
  const trackStore = createTrackStoreMemo([], [currentAssembly]);
  const trackContext: TrackSelectTrackContext = {
    onGeneClick: ({ trackId, transcript }) => {
      console.log("Gene clicked", trackId, transcript.name);
    },
    onBiosampleFeatureHover: ({ trackId, rect }) => {
      console.log("Biosample feature hovered", trackId, rect.name ?? "unknown");
    },
  };

  return (
    <>
      <div>
        {domain.chromosome}:{domain.start}-{domain.end}
      </div>
      <Button
        variant="contained"
        startIcon={<EditIcon />}
        size="small"
        onClick={() => setOpen(true)}
      >
        Select Tracks
      </Button>
      <TrackSelect
        assembly={currentAssembly}
        folders={folders}
        initialSelectedIds={initialSelection}
        sessionStorageKey={`track-select:${currentAssembly}`}
        trackContext={trackContext}
        trackStore={trackStore}
        maxTracks={30}
        open={open}
        onClose={() => setOpen(false)}
        title="Select Tracks"
      />
      <GQLWrapper>
        <Browser browserStore={browserStore} trackStore={trackStore} />
      </GQLWrapper>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);

// Default selections for TrackSelect UI (uses folder row IDs)
const defaultHumanSelections = new Map<string, Set<string>>([
  ["human-genes", new Set(["human-genes/gencode-basic"])],
  [
    "human-biosamples",
    new Set([
      "human-biosamples/ccre-aggregate",
      "human-biosamples/dnase-aggregate",
    ]),
  ],
]);

const defaultMouseSelections = new Map<string, Set<string>>([
  ["mouse-genes", new Set(["mouse-genes/gencode-basic"])],
  [
    "mouse-biosamples",
    new Set([
      "mouse-biosamples/ccre-aggregate",
      "mouse-biosamples/dnase-aggregate",
    ]),
  ],
]);
