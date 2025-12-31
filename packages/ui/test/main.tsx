// react
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Domain,
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
import { Exon } from "@weng-lab/genomebrowser/dist/components/tracks/transcript/types";

interface Transcript {
  id: string;
  name: string;
  coordinates: Domain;
  strand: string;
  exons?: Exon[];
  color?: string;
}

const enum Assembly {
  human = "GRCh38",
  mouse = "mm10",
}

// Callback types for track interactions (using any to avoid type conflicts with library types)
interface TrackCallbacks {
  onHover: (item: any) => void;
  onLeave: () => void;
  onCCREClick: (item: any) => void;
  onGeneClick: (item: any) => void;
}

// Helper to inject callbacks based on track type
function injectCallbacks(track: Track, callbacks: TrackCallbacks): Track {
  if (track.trackType === TrackType.Transcript) {
    return {
      ...track,
      onHover: callbacks.onHover,
      onLeave: callbacks.onLeave,
      onClick: callbacks.onGeneClick,
    };
  }
  if (track.trackType === TrackType.BigBed) {
    return {
      ...track,
      onHover: callbacks.onHover,
      onLeave: callbacks.onLeave,
      onClick: callbacks.onCCREClick,
    };
  }
  return track;
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
    // chr12:53,380,176-53,416,446
    domain: { chromosome: "chr12", start: 53380176, end: 53416446 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const addHighlight = browserStore((s) => s.addHighlight);
  const removeHighlight = browserStore((s) => s.removeHighlight);
  const onHover = useCallback(
    (item: Rect | Transcript) => {
      const domain =
        "start" in item
          ? { start: item.start, end: item.end }
          : { start: item.coordinates.start, end: item.coordinates.end };

      addHighlight({
        id: "hover-highlight",
        domain,
        color: item.color || "blue",
      });
    },
    [addHighlight],
  );
  const onLeave = useCallback(() => {
    removeHighlight("hover-highlight");
  }, [removeHighlight]);

  const onCCREClick = useCallback((item: Rect) => {
    console.log(item);
  }, []);
  const onGeneClick = useCallback((item: Transcript) => {
    console.log(item);
  }, []);

  // Bundle callbacks for track injection
  const callbacks = useMemo<TrackCallbacks>(
    () => ({
      onHover,
      onLeave,
      onCCREClick,
      onGeneClick,
    }),
    [onHover, onLeave, onCCREClick, onGeneClick],
  );

  const trackStore = useLocalTracks(currentAssembly, callbacks);

  const tracks = trackStore((s) => s.tracks);
  const insertTrack = trackStore((s) => s.insertTrack);
  const removeTrack = trackStore((s) => s.removeTrack);

  const selectionStore = useMemo(() => {
    const localIds = getLocalStorage(currentAssembly);
    const ids = localIds != null ? localIds : new Set<string>();
    return createSelectionStore(currentAssembly, ids);
  }, [currentAssembly]);

  const rowById = selectionStore((s) => s.rowById);

  // Handle submit: sync tracks to browser and save to localStorage
  const handleSubmit = useCallback(
    (newTrackIds: Set<string>) => {
      const currentIds = new Set(tracks.map((t) => t.id));

      // Build tracks to add from newTrackIds + rowById lookup
      const tracksToAdd = Array.from(newTrackIds)
        .filter((id) => !currentIds.has(id)) // not in current track list
        .map((id) => rowById.get(id)) // get RowInfo object
        .filter((track): track is RowInfo => track !== undefined); // filter out undefined

      const tracksToRemove = tracks.filter((t) => {
        return !t.id.includes("ignore") && !newTrackIds.has(t.id);
      });

      console.log("removing", tracksToRemove);
      for (const t of tracksToRemove) {
        removeTrack(t.id);
      }

      for (const s of tracksToAdd) {
        const track = generateTrack(s, callbacks);
        if (track === null) continue;
        insertTrack(track);
      }

      // Save the track IDs (not the auto-generated group IDs)
      setLocalStorage(newTrackIds, currentAssembly);
      // Close the dialog
      setOpen(false);
    },
    [tracks, removeTrack, insertTrack, callbacks],
  );

  const handleCancel = () => {
    setOpen(false);
  };

  // Handle reset: clear selections and remove non-default tracks
  const handleReset = () => {
    // Clear the selection store
    selectionStore.getState().clear();

    // Remove all non-default tracks from the browser
    const tracksToRemove = tracks.filter((t) => !t.id.includes("ignore"));
    for (const t of tracksToRemove) {
      removeTrack(t.id);
    }

    // Clear localStorage for selected tracks
    setLocalStorage(new Set(), currentAssembly);
  };

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
          <TrackSelect
            store={selectionStore}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onReset={handleReset}
          />
        </DialogContent>
      </Dialog>
      <GQLWrapper>
        <Browser browserStore={browserStore} trackStore={trackStore} />
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
  rnaseq: "#00aa00",
  chromhmm: "#00ff00",
  ccre: "#0c184a",
};

function generateTrack(sel: RowInfo, callbacks?: TrackCallbacks): Track {
  const color = ASSAY_COLORS[sel.assay.toLowerCase()] || "#000000";
  let track: Track;

  switch (sel.assay.toLowerCase()) {
    case "chromhmm":
      track = {
        ...defaultBigBed,
        id: sel.id,
        url: sel.url,
        title: sel.displayname,
        color,
      };
      break;
    case "ccre":
      track = {
        ...defaultBigBed,
        id: sel.id,
        url: sel.url,
        title: sel.displayname,
        color,
      };
      break;
    default:
      track = {
        ...defaultBigWig,
        id: sel.id,
        url: sel.url,
        title: sel.displayname,
        color,
      };
  }

  return callbacks ? injectCallbacks(track, callbacks) : track;
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

export function useLocalTracks(assembly: string, callbacks?: TrackCallbacks) {
  const localTracks = getLocalTracks(assembly);

  const defaultTracks =
    assembly === "GRCh38" ? defaultHumanTracks : defaultMouseTracks;

  // Get base tracks (from storage or defaults)
  let initialTracks = localTracks || defaultTracks;

  // Inject callbacks if provided (callbacks are lost on JSON serialization)
  if (callbacks) {
    initialTracks = initialTracks.map((t) => injectCallbacks(t, callbacks));
  }

  const trackStore = createTrackStoreMemo(initialTracks, []);
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
    color: ASSAY_COLORS.ccre,
    id: "mouse-genes-ignore",
    assembly: "mm10",
    version: 21,
  },
  {
    ...defaultBigBed,
    color: ASSAY_COLORS.ccre,
    id: "mouse-ccre-ignore",
    title: "All cCREs colored by group",
    url: "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed",
  },
  {
    ...defaultBigWig,
    color: ASSAY_COLORS.dnase,
    id: "mouse-dnase-aggregate-ignore",
    title: "Aggregated DNase signal, all ENCODE biosamples",
    url: "https://downloads.wenglab.org/DNase_MM10_ENCODE_DEC2024_merged_nanrm.bigWig",
  },
];
