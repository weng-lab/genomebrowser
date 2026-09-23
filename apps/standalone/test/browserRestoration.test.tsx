// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { Browser } from "../features/browser/Browser";
import { createBrowserStores } from "../features/browser/stores";
import { defaultAssembly } from "../features/browser/assembly";
import { captureSessionSnapshot } from "../features/sessions/snapshot";
import { createInitialSnapshot } from "../features/sessions/initialSnapshot";

// Keep the real store factories and TrackSelect, including its mount-time effects.
// Drawing and unrelated controls are omitted to avoid fetching genomic data.
vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  GenomeBrowser: vi.fn(() => null),
}));
vi.mock("@weng-lab/genomebrowser-ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser-ui")>()),
  ControlToolbar: () => null,
  HighlightDialog: () => null,
}));
vi.mock("../features/sessions/SessionAutosave", () => ({ SessionAutosave: () => null }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function mountedStores() {
  const props = vi.mocked(GenomeBrowser).mock.calls.at(-1)![0];
  return { useBrowserStore: props.browserStore, useTrackStore: props.trackStore };
}

it("keeps all eight saved tracks, their settings, and their order after the selector mounts", async () => {
  const { useBrowserStore, useTrackStore } = createBrowserStores();
  const genes = defaultAssembly.reference.genes
    .filter(({ id }) => id !== defaultAssembly.reference.defaultGeneDatasetId)
    .slice(0, 5);
  for (const gene of genes) {
    useTrackStore.getState().addTrack(
      geneModule.create({
        base: {
          id: `reference-annotations::${gene.id}`,
          title: gene.id,
          height: 125,
          color: "#ABCDEF",
        },
        source: "host",
        config: { url: gene.url },
      }),
    );
  }
  useTrackStore.getState().addTrack(
    bigWigModule.create({
      base: { id: "saved-custom-signal", title: "Custom signal" },
      source: "user",
      config: { url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw" },
    }),
  );
  const ids = useTrackStore.getState().order;
  useTrackStore.getState().reorderTracks([ids[0], ids[2], ids[7], ids[1], ...ids.slice(3, 7)]);
  const snapshot = captureSessionSnapshot(useBrowserStore, useTrackStore);
  expect(snapshot.trackStore.tracks).toHaveLength(8);

  await act(async () =>
    root.render(
      <StrictMode>
        <Browser initialSnapshot={snapshot} />
      </StrictMode>,
    ),
  );
  const restored = mountedStores();
  expect(
    captureSessionSnapshot(restored.useBrowserStore, restored.useTrackStore).trackStore,
  ).toEqual(snapshot.trackStore);
  await act(async () =>
    root.render(
      <StrictMode>
        <Browser initialSnapshot={snapshot} />
      </StrictMode>,
    ),
  );
  expect(
    captureSessionSnapshot(restored.useBrowserStore, restored.useTrackStore).trackStore,
  ).toEqual(snapshot.trackStore);
});

it("keeps an intentionally empty saved session empty", async () => {
  const snapshot = createInitialSnapshot(defaultAssembly);
  snapshot.trackStore = { tracks: [], pinnedTrackIds: [] };
  await act(async () => root.render(<Browser initialSnapshot={snapshot} />));
  expect(mountedStores().useTrackStore.getState().tracks).toEqual([]);
});

it("seeds guest stores with the default ruler and gene tracks", async () => {
  await act(async () => root.render(<Browser />));
  expect(mountedStores().useTrackStore.getState().order).toEqual([
    "reference-ruler",
    `reference-annotations::${defaultAssembly.reference.defaultGeneDatasetId}`,
  ]);
});
