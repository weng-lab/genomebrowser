import type { TrackStore } from "@weng-lab/genomebrowser";
import { useMemo, useState } from "react";
import type { CompiledTrackCollections } from "../collection/collectionCompilation";
import {
  clearOrderedSelection,
  createOrderedSelectionFromTracks,
  createSelectionByCollection,
  removeOrderedTrackIds,
  setOrderedCollectionSelection,
} from "../collection/collectionSelection";
import type { TrackSelectInteractionResolver } from "../collection/collectionInteraction";
import { getReconciledTracks } from "../collection/collectionStore";
import { getActiveView, getInitialViewIds } from "../collection/collectionViews";

type TrackSelectScreen = "collection-list" | "collection-detail";

type TrackSelectStateOptions = {
  compiledCollections: CompiledTrackCollections;
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
  compiledCollections,
  tracks,
  registry,
  setTracks,
  defaultTrackIds,
  onCommittedTrackIds,
  maxTracks,
  onClose,
  resolveTrackInteraction,
}: TrackSelectStateOptions) {
  const collections = compiledCollections.records;
  const [screen, setScreen] = useState<TrackSelectScreen>(() =>
    collections.length === 1 ? "collection-detail" : "collection-list",
  );
  const [activeCollectionId, setActiveCollectionId] = useState(() => collections[0]?.id ?? "");
  const [activeViewIdByCollection, setActiveViewIdByCollection] = useState(() =>
    getInitialViewIds(collections),
  );
  const [selectedTrackIds, setSelectedTrackIds] = useState(() =>
    createOrderedSelectionFromTracks(compiledCollections, tracks),
  );
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const currentScreen = getCurrentScreen(screen, collections.length);
  const activeCollection =
    compiledCollections.recordsById.get(activeCollectionId) ?? collections[0];
  const activeView = activeCollection
    ? getActiveView(activeCollection, activeViewIdByCollection)
    : undefined;
  const selectedByCollection = useMemo(
    () => createSelectionByCollection(compiledCollections, selectedTrackIds),
    [compiledCollections, selectedTrackIds],
  );
  const selectedTrackCount = selectedTrackIds.length;

  function selectCollection(collectionId: string) {
    setActiveCollectionId(collectionId);
    setScreen("collection-detail");
  }

  function selectView(viewId: string) {
    if (!activeCollection) return;

    setActiveViewIdByCollection((current) => {
      const next = new Map(current);
      next.set(activeCollection.id, viewId);
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

  function selectActiveCollectionTracks(selectedIds: Set<string>) {
    if (!activeCollection || !activeView) return;
    setDraftSelection(
      setOrderedCollectionSelection({
        selectedTrackIds,
        collection: activeCollection,
        view: activeView,
        selectedIds,
      }),
    );
  }

  function clearDraftSelection() {
    setDraftSelection(
      clearOrderedSelection(
        selectedTrackIds,
        currentScreen === "collection-detail" ? activeCollection : undefined,
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
        compiledCollections,
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
      collections,
      screen: currentScreen,
      activeCollection,
      activeView,
      activeViewIdByCollection,
      selectedByCollection,
      selectedTrackCount,
      limitDialogOpen,
      submitError,
    },
    actions: {
      selectCollection,
      backToCollections: () => setScreen("collection-list"),
      selectView,
      selectActiveCollectionTracks,
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

function getCurrentScreen(screen: TrackSelectScreen, collectionCount: number) {
  if (collectionCount === 0) return "collection-list";
  if (collectionCount === 1) return "collection-detail";
  return screen;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Track Select error";
}
