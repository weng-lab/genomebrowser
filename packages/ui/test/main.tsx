// react
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// mui
import EditIcon from "@mui/icons-material/Edit";
import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";

// weng lab
import {
  BigBedConfig,
  BigWigConfig,
  Browser,
  createBrowserStoreMemo,
  createTrackStoreMemo,
  DisplayMode,
  GQLWrapper,
  Rect,
  Track,
  TrackType,
  TranscriptConfig,
} from "@weng-lab/genomebrowser";

// local
import { createSelectionStore } from "../src/TrackSelect/store";
import TrackSelect from "../src/TrackSelect/TrackSelect";
import { RowInfo } from "../src/TrackSelect/types";
import { createDataStoreMemo } from "@weng-lab/genomebrowser/src/lib";

const enum Assembly {
  human = "GRCh38",
  mouse = "mm10",
}

function getLocalStorage(assembly: Assembly): Set<string> | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;

  const selectedIds = sessionStorage.getItem(assembly + "-selected-tracks");
  if (!selectedIds) return null;
  const idsArray = JSON.parse(selectedIds) as string[];
  return new Set(idsArray);
}

function setLocalStorage(trackIds: Set<string>, assembly: Assembly) {
  sessionStorage.setItem(
    assembly + "-selected-tracks",
    JSON.stringify([...trackIds]),
  );
}

function Main() {
  const [open, setOpen] = useState(false);
  const currentAssembly = Assembly.human;

  const browserStore = createBrowserStoreMemo({
    domain: { chromosome: "chr19", start: 44905754, end: 44905754 + 20000 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const trackStore = useLocalTracks(currentAssembly);

  const dataStore = createDataStoreMemo();
  const tracks = trackStore((s) => s.tracks);
  const insertTrack = trackStore((s) => s.insertTrack);
  const removeTrack = trackStore((s) => s.removeTrack);
  const reset = dataStore((s) => s.reset);

  const selectionStore = useMemo(() => {
    const localIds = getLocalStorage(currentAssembly);
    const ids = localIds != null ? localIds : new Set<string>();
    return createSelectionStore(currentAssembly, ids);
  }, [currentAssembly]);

  const selectedIds = selectionStore((s) => s.selectedIds);
  const getTrackIds = selectionStore((s) => s.getTrackIds);
  const rowById = selectionStore((s) => s.rowById);

  // Get only real track IDs (no auto-generated group IDs)
  const trackIds = useMemo(() => getTrackIds(), [selectedIds, getTrackIds]);

  useEffect(() => {
    const currentIds = new Set(tracks.map((t) => t.id));

    // Build tracks to add from trackIds + rowById lookup
    const tracksToAdd = Array.from(trackIds)
      .filter((id) => !currentIds.has(id))
      .map((id) => rowById.get(id))
      .filter((track): track is RowInfo => track !== undefined);

    const tracksToRemove = tracks.filter((t) => {
      return !t.id.includes("ignore") && !trackIds.has(t.id);
    });

    for (const t of tracksToRemove) {
      removeTrack(t.id);
    }

    for (const s of tracksToAdd) {
      const track = generateTrack(s);
      if (track === null) continue;
      insertTrack(track);
    }

    // Save the track IDs (not the auto-generated group IDs)
    setLocalStorage(trackIds, currentAssembly);
  }, [trackIds, insertTrack, removeTrack, currentAssembly]);

  return (
    <>
      <Button
        variant="contained"
        startIcon={<EditIcon />}
        size="small"
        onClick={() => setOpen(true)}
      >
        Select Tracks
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Select Tracks</DialogTitle>
        <DialogContent>
          <TrackSelect store={selectionStore} />
        </DialogContent>
      </Dialog>
      <GQLWrapper>
        <Browser
          browserStore={browserStore}
          trackStore={trackStore}
          externalDataStore={dataStore}
        />
      </GQLWrapper>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);

const ASSAY_COLORS: Record<string, string> = {
  dnase: "#06da93",
  h3k4me3: "#ff0000",
  h3k27ac: "#ffcd00",
  ctcf: "#00b0d0",
  atac: "#02c7b9",
  chromhmm: "#00ff00",
  ccre: "#0c184a",
};

const CCRE_COLOR = "#4444ff"; // temporary
function generateTrack(sel: RowInfo): Track {
  const color = ASSAY_COLORS[sel.assay.toLowerCase()] || "#000000";
  switch (sel.assay.toLowerCase()) {
    case "chromhmm":
      return {
        ...defaultBigBed,
        id: sel.fileAccession || sel.experimentAccession,
        url: sel.url,
        title: sel.displayname,
        color,
      };
    case "ccre":
      return {
        ...defaultBigBed,
        id: sel.fileAccession || sel.experimentAccession,
        url: sel.url,
        title: sel.displayname,
        color: CCRE_COLOR,
      };
    default:
      return {
        ...defaultBigWig,
        id: sel.fileAccession,
        url: sel.url,
        title: sel.displayname,
        color,
      };
  }
}

export const defaultBigWig: Omit<BigWigConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigWig,
  height: 50,
  displayMode: DisplayMode.Full,
  titleSize: 12,
};

export const defaultBigBed: Omit<BigBedConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigBed,
  height: 20,
  displayMode: DisplayMode.Dense,
  titleSize: 12,
};

export const defaultTranscript: Omit<
  TranscriptConfig,
  "id" | "assembly" | "version"
> = {
  title: "GENCODE Genes",
  trackType: TrackType.Transcript,
  displayMode: DisplayMode.Squish,
  height: 100,
  color: "#0c184a", // screen theme default
  canonicalColor: "#100e98", // screen theme light
  highlightColor: "#3c69e8", // bright blue
  titleSize: 12,
};

export function useLocalTracks(assembly: string) {
  const localTracks = getLocalTracks(assembly);

  const defaultTracks =
    assembly === "GRCh38" ? defaultHumanTracks : defaultMouseTracks;

  // potential infinite loop
  const trackStore = createTrackStoreMemo(localTracks || defaultTracks, []);
  const tracks = trackStore((state) => state.tracks);

  // any time the track list changes, update local storage
  useEffect(() => {
    setLocalTracks(tracks, assembly);
  }, [tracks, assembly]);

  return trackStore;
}

export function getLocalTracks(assembly: string): Track[] | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;

  const localTracks = sessionStorage.getItem(assembly + "-" + "tracks");
  if (!localTracks) return null;
  const localTracksJson = JSON.parse(localTracks) as Track[];
  return localTracksJson;
}

export function setLocalTracks(tracks: Track[], assembly: string) {
  sessionStorage.setItem(assembly + "-tracks", JSON.stringify(tracks));
}

const defaultHumanTracks = [
  {
    ...defaultTranscript,
    color: ASSAY_COLORS.ccre,
    id: "human-genes-ignore",
    assembly: "GRCh38",
    version: 40,
  },
  {
    ...defaultBigBed,
    color: ASSAY_COLORS.ccre,
    id: "human-ccre-ignore",
    title: "All cCREs colored by group",
    url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  },
  {
    ...defaultBigWig,
    color: ASSAY_COLORS.dnase,
    id: "human-dnase-aggregate-ignore",
    title: "Aggregated DNase signal, all ENCODE biosamples",
    url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
  },
];

const defaultMouseTracks = [
  {
    ...defaultTranscript,
    color: "#D05F45",
    id: "mouse-genes-ignore",
    assembly: "mm10",
    version: 21,
  },
  {
    ...defaultBigBed,
    id: "mouse-ccre-ignore",
    title: "All cCREs colored by group",
    url: "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed",
    color: "#D05F45",
  },
  {
    ...defaultBigWig,
    color: ASSAY_COLORS.dnase,
    id: "mouse-dnase-aggregate-ignore",
    title: "Aggregated DNase signal, all ENCODE biosamples",
    url: "https://downloads.wenglab.org/DNase_MM10_ENCODE_DEC2024_merged_nanrm.bigWig",
  },
];
