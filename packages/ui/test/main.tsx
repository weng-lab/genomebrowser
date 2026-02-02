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
import { Button } from "@mui/material";

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
import type { BiosampleRowInfo } from "../src/TrackSelect/Folders/biosamples/shared/types";
import type { GeneRowInfo } from "../src/TrackSelect/Folders/genes/shared/types";
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
    // chr7:19,695,494-19,699,803
    domain: { chromosome: "chr7", start: 19695494, end: 19699803 },
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

  const initialSelection = useMemo(
    () =>
      (currentAssembly as Assembly) === "GRCh38"
        ? defaultHumanSelections
        : defaultMouseSelections,
    [currentAssembly],
  );

  // sync tracks to browser and save to localStorage
  const handleSubmit = useCallback(
    (selectedByFolder: Map<string, Set<string>>) => {
      const currentIds = new Set(tracks.map((t) => t.id));
      const selectedIds = new Set<string>();
      const tracksToAdd: Array<{ row: unknown; folderId: string }> = [];

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
            tracksToAdd.push({ row, folderId: folder.id });
          }
        });
      }

      const tracksToRemove = tracks.filter((t) => !selectedIds.has(t.id));
      for (const t of tracksToRemove) {
        removeTrack(t.id);
      }

      for (const { row, folderId } of tracksToAdd) {
        const track = generateTrack(
          row as BiosampleRowInfo | GeneRowInfo,
          folderId,
          currentAssembly,
          callbacks,
        );
        if (track === null) continue;
        insertTrack(track);
      }
    },
    [tracks, removeTrack, insertTrack, callbacks, folders, currentAssembly],
  );

  // clear selections and remove all tracks
  const handleClear = () => {
    for (const t of tracks) {
      removeTrack(t.id);
    }
  };

  // On first load, if no stored selection exists, apply initial selection
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) {
      handleSubmit(initialSelection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        initialSelection={initialSelection}
        onSubmit={handleSubmit}
        onClear={handleClear}
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
  row: BiosampleRowInfo | GeneRowInfo,
  folderId: string,
  assembly: Assembly,
  callbacks?: TrackCallbacks,
): Track | null {
  // Handle gene folders
  if (folderId.includes("genes")) {
    const geneRow = row as GeneRowInfo;
    const track: Track = {
      ...defaultTranscript,
      id: geneRow.id,
      assembly,
      version: geneRow.versions[geneRow.versions.length - 1], // latest version
    };
    return callbacks ? injectCallbacks(track, callbacks) : track;
  }

  // Handle biosample folders
  const sel = row as BiosampleRowInfo;
  const color = ASSAY_COLORS[sel.assay.toLowerCase()] || "#000000";
  let track: Track;

  switch (sel.assay.toLowerCase()) {
    case "chromhmm":
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

  // Start empty if no stored tracks - TrackSelect will populate defaults
  let initialTracks: Track[] = localTracks || [];

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

  const localTracks = sessionStorage.getItem(assembly + "-tracks");
  if (!localTracks) return null;
  const localTracksJson = JSON.parse(localTracks) as Track[];
  return localTracksJson;
}

export function setLocalTracks(tracks: Track[], assembly: string) {
  sessionStorage.setItem(assembly + "-tracks", JSON.stringify(tracks));
}

// Default selections for TrackSelect UI (uses folder row IDs)
const defaultHumanSelections = new Map<string, Set<string>>([
  ["human-genes", new Set(["gencode-basic"])],
  ["human-biosamples", new Set(["ccre-aggregate", "dnase-aggregate"])],
]);

const defaultMouseSelections = new Map<string, Set<string>>([
  ["mouse-genes", new Set(["gencode-basic"])],
  ["mouse-biosamples", new Set(["ccre-aggregate", "dnase-aggregate"])],
]);
