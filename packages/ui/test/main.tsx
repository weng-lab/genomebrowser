/// <reference types="vite/client" />

// react
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// license
import { LicenseInfo } from "@mui/x-license";
const muiLicenseKey = import.meta.env.VITE_MUI_X_LICENSE_KEY;
if (muiLicenseKey) {
  LicenseInfo.setLicenseKey(muiLicenseKey);
}

// mui
import EditIcon from "@mui/icons-material/Edit";
import { Box, Button } from "@mui/material";

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
import { foldersByAssembly, TrackSelect } from "../src/lib";
import type { FolderDefinition } from "../src/TrackSelect/Folders";
import type { BiosampleRowInfo } from "../src/TrackSelect/Folders/biosamples/shared/types";
import { Exon } from "@weng-lab/genomebrowser/dist/components/tracks/transcript/types";

interface Transcript {
  id: string;
  name: string;
  coordinates: Domain;
  strand: string;
  exons?: Exon[];
  color?: string;
}

type Assembly = "GRCh38" | "mm10";

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

function Main() {
  const [open, setOpen] = useState(false);
  const currentAssembly: Assembly = "GRCh38";

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

  const folders = useMemo(
    () => foldersByAssembly[currentAssembly],
    [currentAssembly],
  );

  const storageKey = `${currentAssembly}-selected-tracks`;

  // sync tracks to browser and save to localStorage
  const handleSubmit = useCallback(
    (selectedByFolder: Map<string, Set<string>>) => {
      const currentIds = new Set(tracks.map((t) => t.id));
      const selectedIds = new Set<string>();
      const tracksToAdd: BiosampleRowInfo[] = [];

      for (const folder of folders) {
        const folderSelection =
          selectedByFolder.get(folder.id) ?? new Set<string>();
        folderSelection.forEach((id) => {
          selectedIds.add(id);
          if (currentIds.has(id)) {
            return;
          }
          const row = folder.rowById.get(id);
          if (row) {
            tracksToAdd.push(row as BiosampleRowInfo);
          }
        });
      }

      const tracksToRemove = tracks.filter((t) => {
        return !t.id.includes("ignore") && !selectedIds.has(t.id);
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
    },
    [tracks, removeTrack, insertTrack, callbacks, folders],
  );

  const handleCancel = () => {
    // TrackSelect handles restoring snapshot internally
  };

  // clear selections and remove non-default tracks
  const handleReset = () => {
    const tracksToRemove = tracks.filter((t) => !t.id.includes("ignore"));
    for (const t of tracksToRemove) {
      removeTrack(t.id);
    }
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
      <TrackSelect
        folders={folders}
        storageKey={storageKey}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onReset={handleReset}
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

const ASSAY_COLORS: Record<string, string> = {
  dnase: "#06da93",
  h3k4me3: "#ff0000",
  h3k27ac: "#ffcd00",
  ctcf: "#00b0d0",
  atac: "#02c7b9",
  rnaseq: "#00aa00",
  chromhmm: "#00ff00",
  ccre: "#000000",
};

function generateTrack(
  sel: BiosampleRowInfo,
  callbacks?: TrackCallbacks,
): Track {
  const color = ASSAY_COLORS[sel.assay.toLowerCase()] || "#000000";
  let track: Track;

  switch (sel.assay.toLowerCase()) {
    case "chromhmm":
      track = {
        ...defaultBigBed,
        id: sel.id,
        url: sel.url,
        title: sel.displayName,
        color,
      };
      break;
    case "ccre":
      track = {
        ...defaultBigBed,
        id: sel.id,
        url: sel.url,
        title: sel.displayName,
        color,
      };
      break;
    default:
      track = {
        ...defaultBigWig,
        id: sel.id,
        url: sel.url,
        title: sel.displayName,
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
