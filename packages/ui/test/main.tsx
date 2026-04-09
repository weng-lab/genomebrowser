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
import { foldersByAssembly, TrackSelect } from "../src/lib";

type Assembly = "GRCh38" | "mm10";

function Main() {
  const [open, setOpen] = useState(false);
  const currentAssembly: Assembly = "GRCh38";

  const browserStore = createBrowserStoreMemo({
    // chr7:19,695,494-19,699,803
    // chr1:11103779-11262792
    domain: { chromosome: "chr12", start: 53380108, end: 53416378 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const domain = browserStore((s) => s.domain);
  const trackStore = createTrackStoreMemo([], []);

  const folders = foldersByAssembly[currentAssembly];

  const storageKey = `${currentAssembly}-selected-tracks`;
  const initialSelection =
    currentAssembly === "GRCh38"
      ? defaultHumanSelections
      : defaultMouseSelections;

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
        trackStore={trackStore}
        storageKey={storageKey}
        defaultManagedIds={initialSelection}
        maxTracks={30}
        open={open}
        onClose={() => setOpen(false)}
        title="Biosample Tracks"
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
  ["human-genes", new Set(["gencode-basic"])],
  ["human-biosamples", new Set(["ccre-aggregate", "dnase-aggregate"])],
]);

const defaultMouseSelections = new Map<string, Set<string>>([
  ["mouse-genes", new Set(["gencode-basic"])],
  ["mouse-biosamples", new Set(["ccre-aggregate", "dnase-aggregate"])],
]);
