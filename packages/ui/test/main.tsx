/// <reference types="vite/client" />

// react
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Domain,
  GQLWrapper,
  Rect,
  Track,
  TrackType,
} from "@weng-lab/genomebrowser";

// local
import { foldersByAssembly, TrackSelect } from "../src/lib";
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
    // chr1:11103779-11262792
    domain: { chromosome: "chr12", start: 53380108, end: 53416378 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const domain = browserStore((s) => s.domain);

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
