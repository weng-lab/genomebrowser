import type { TrackStore } from "@weng-lab/genomebrowser";
import { useState } from "react";
import {
  clearOrderedSelection,
  createOrderedSelectionFromTracks,
  createSelectionByCatalog,
  removeOrderedTrackIds,
  setOrderedCatalogSelection,
} from "../catalog/catalogSelection";
import type { TrackSelectInteractionResolver } from "../catalog/catalogInteraction";
import { getReconciledTracks } from "../catalog/catalogStore";
import { getActiveView, getInitialViewIds } from "../catalog/catalogViews";
import type { TrackSelectCatalog } from "../schema/catalogSchema";

type TrackSelectScreen = "catalog-list" | "catalog-detail";

type TrackSelectStateOptions = {
  trackCatalogs: TrackSelectCatalog[];
  tracks: TrackStore["tracks"];
  registry: TrackStore["registry"];
  setTracks: TrackStore["setTracks"];
  defaultTrackIds?: readonly string[];
  onCommittedTrackIds?: (trackIds: readonly string[]) => void;
  maxTracks: number;
  onClose: () => void;
  resolveTrackInteraction?: TrackSelectInteractionResolver;
};

export type TrackSelectState = ReturnType<typeof useTrackSelectState>;

export function useTrackSelectState({
  trackCatalogs,
  tracks,
  registry,
  setTracks,
  defaultTrackIds,
  onCommittedTrackIds,
  maxTracks,
  onClose,
  resolveTrackInteraction,
}: TrackSelectStateOptions) {
  const [screen, setScreen] = useState<TrackSelectScreen>(() =>
    trackCatalogs.length === 1 ? "catalog-detail" : "catalog-list",
  );
  const [activeCatalogId, setActiveCatalogId] = useState(() => trackCatalogs[0]?.id ?? "");
  const [activeViewIdByCatalog, setActiveViewIdByCatalog] = useState(() =>
    getInitialViewIds(trackCatalogs),
  );
  const [selectedTrackIds, setSelectedTrackIds] = useState(() =>
    createOrderedSelectionFromTracks(trackCatalogs, tracks),
  );
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const currentScreen = getCurrentScreen(screen, trackCatalogs.length);
  const activeCatalog =
    trackCatalogs.find((catalog) => catalog.id === activeCatalogId) ?? trackCatalogs[0];
  const activeView = activeCatalog
    ? getActiveView(activeCatalog, activeViewIdByCatalog)
    : undefined;
  const selectedByCatalog = createSelectionByCatalog(trackCatalogs, selectedTrackIds);
  const selectedTrackCount = selectedTrackIds.length;

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

  function setDraftSelection(nextSelectedTrackIds: string[]) {
    const currentCount = selectedTrackIds.length;
    const nextCount = nextSelectedTrackIds.length;
    if (nextCount > maxTracks && nextCount > currentCount) {
      setLimitDialogOpen(true);
      return;
    }

    setSubmitError(undefined);
    setSelectedTrackIds(nextSelectedTrackIds);
  }

  function selectActiveCatalogTracks(selectedIds: Set<string>) {
    if (!activeCatalog || !activeView) return;
    setDraftSelection(
      setOrderedCatalogSelection({
        selectedTrackIds,
        catalog: activeCatalog,
        view: activeView,
        selectedIds,
      }),
    );
  }

  function clearDraftSelection() {
    setDraftSelection(
      clearOrderedSelection(
        selectedTrackIds,
        currentScreen === "catalog-detail" ? activeCatalog : undefined,
      ),
    );
  }

  function resetDraftSelection() {
    setSubmitError(undefined);
    setSelectedTrackIds([...(defaultTrackIds ?? [])]);
  }

  function removeSelectedTrackIds(trackIds: string[]) {
    setDraftSelection(removeOrderedTrackIds(selectedTrackIds, trackIds));
  }

  function submitSelection() {
    setSubmitError(undefined);

    let nextTracks: TrackStore["tracks"];
    try {
      nextTracks = getReconciledTracks({
        trackCatalogs,
        tracks,
        selectedTrackIds,
        registry,
        maxTracks,
        resolveTrackInteraction,
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      return;
    }

    const result = setTracks(nextTracks);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    try {
      onCommittedTrackIds?.([...selectedTrackIds]);
    } finally {
      onClose();
    }
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
