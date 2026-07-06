import type { TrackInstance, TrackStore } from "@weng-lab/genomebrowser-v2";
import { useState } from "react";
import { getSelectionDiff } from "../catalog/catalogDiff";
import {
  clearSelection,
  countSelectedTracks,
  createSelectionFromTracks,
  removeTrackIdsFromSelection,
  setCatalogSelection,
  type SelectedByCatalog,
} from "../catalog/catalogSelection";
import { getActiveView, getInitialViewIds } from "../catalog/catalogViews";
import type { TrackSelectCatalog } from "../schema/catalogSchema";

type TrackSelectScreen = "catalog-list" | "catalog-detail";

type TrackSelectStateOptions = {
  trackCatalogs: TrackSelectCatalog[];
  tracks: TrackStore["tracks"];
  registry: TrackStore["registry"];
  applyTrackChanges: TrackStore["applyTrackChanges"];
  maxTracks: number;
  onClose: () => void;
};

export type TrackSelectState = ReturnType<typeof useTrackSelectState>;

export function useTrackSelectState({
  trackCatalogs,
  tracks,
  registry,
  applyTrackChanges,
  maxTracks,
  onClose,
}: TrackSelectStateOptions) {
  const [screen, setScreen] = useState<TrackSelectScreen>(() =>
    trackCatalogs.length === 1 ? "catalog-detail" : "catalog-list",
  );
  const [activeCatalogId, setActiveCatalogId] = useState(() => trackCatalogs[0]?.id ?? "");
  const [activeViewIdByCatalog, setActiveViewIdByCatalog] = useState(() =>
    getInitialViewIds(trackCatalogs),
  );
  const [selectedByCatalog, setSelectedByCatalog] = useState(() =>
    createSelectionFromTracks(trackCatalogs, tracks),
  );
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const currentScreen = getCurrentScreen(screen, trackCatalogs.length);
  const activeCatalog =
    trackCatalogs.find((catalog) => catalog.id === activeCatalogId) ?? trackCatalogs[0];
  const activeView = activeCatalog
    ? getActiveView(activeCatalog, activeViewIdByCatalog)
    : undefined;
  const selectedTrackCount = countSelectedTracks(selectedByCatalog);

  function selectCatalog(catalogId: string) {
    setActiveCatalogId(catalogId);
    setScreen("catalog-detail");
  }

  function selectView(viewId: string) {
    if (!activeCatalog) return;

    setActiveViewIdByCatalog((current) => {
      const next = new Map(current);
      next.set(activeCatalog.id, viewId);
      return next;
    });
  }

  function setDraftSelection(nextSelectedByCatalog: SelectedByCatalog) {
    const currentCount = countSelectedTracks(selectedByCatalog);
    const nextCount = countSelectedTracks(nextSelectedByCatalog);
    if (nextCount > maxTracks && nextCount > currentCount) {
      setLimitDialogOpen(true);
      return;
    }

    setSubmitError(undefined);
    setSelectedByCatalog(nextSelectedByCatalog);
  }

  function selectActiveCatalogTracks(selectedIds: Set<string>) {
    if (!activeCatalog) return;
    setDraftSelection(setCatalogSelection(selectedByCatalog, activeCatalog.id, selectedIds));
  }

  function clearDraftSelection() {
    setDraftSelection(
      clearSelection(
        trackCatalogs,
        selectedByCatalog,
        currentScreen === "catalog-detail" ? activeCatalog?.id : undefined,
      ),
    );
  }

  function resetDraftSelection() {
    setSubmitError(undefined);
    setSelectedByCatalog(createSelectionFromTracks(trackCatalogs, tracks));
  }

  function removeSelectedTrackIds(trackIds: string[]) {
    setDraftSelection(removeTrackIdsFromSelection(selectedByCatalog, trackIds));
  }

  function submitSelection() {
    setSubmitError(undefined);

    const { idsToRemove, tracksToAdd } = getSelectionDiff({
      trackCatalogs,
      tracks,
      selectedByCatalog,
      activeViewIdByCatalog,
    });

    let createdTracks: TrackInstance<any, any>[];
    try {
      createdTracks = tracksToAdd.map(({ id, track }) =>
        registry.get(track.type).create({ ...track.config, id }),
      );
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      return;
    }

    const result = applyTrackChanges({ add: createdTracks, remove: idsToRemove });
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    onClose();
  }

  return {
    state: {
      trackCatalogs,
      screen: currentScreen,
      activeCatalog,
      activeView,
      activeViewIdByCatalog,
      selectedByCatalog,
      selectedTrackCount,
      limitDialogOpen,
      submitError,
    },
    actions: {
      selectCatalog,
      backToCatalogs: () => setScreen("catalog-list"),
      selectView,
      selectActiveCatalogTracks,
      removeSelectedTrackIds,
      clearDraftSelection,
      resetDraftSelection,
      submitSelection,
      cancel: onClose,
      closeLimitDialog: () => setLimitDialogOpen(false),
    },
    meta: {
      maxTracks,
    },
  };
}

function getCurrentScreen(screen: TrackSelectScreen, catalogCount: number) {
  if (catalogCount === 0) return "catalog-list";
  if (catalogCount === 1) return "catalog-detail";
  return screen;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Track Select error";
}
