import { useEffect, useMemo } from "react";
import { createSelectionStore } from "../src/TrackSelect/store";
import TrackSelect from "../src/TrackSelect/TrackSelect";
import { createRoot } from "react-dom/client";

function getLocalStorage(assembly: string): Set<string> | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;

  const selectedIds = sessionStorage.getItem(assembly + "-selected-tracks");
  if (!selectedIds) return null;
  const idsArray = JSON.parse(selectedIds) as string[];
  return new Set(idsArray);
}

function setLocalStorage(trackIds: Set<string>, assembly: string) {
  sessionStorage.setItem(
    assembly + "-selected-tracks",
    JSON.stringify([...trackIds]),
  );
}

const assembly = "grch38";
function Main() {
  const selectionStore = useMemo(() => {
    const localIds = getLocalStorage(assembly);
    const ids = localIds != null ? localIds : new Set<string>();
    return createSelectionStore(ids);
  }, [assembly]);

  const selectedIds = selectionStore((s) => s.selectedIds);
  const getTrackIds = selectionStore((s) => s.getTrackIds);

  // Get only real track IDs (no auto-generated group IDs)
  const trackIds = useMemo(() => getTrackIds(), [selectedIds, getTrackIds]);

  useEffect(() => {
    setLocalStorage(trackIds, assembly);
  }, [assembly, trackIds]);

  return <TrackSelect store={selectionStore} />;
}

createRoot(document.getElementById("root")!).render(<Main />);
