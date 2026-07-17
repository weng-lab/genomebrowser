// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTrackStore, defineTrackModule, type TrackStore } from "../../v2/src/lib";
import TrackSelect from "../src/TrackSelect/TrackSelect";
import type {
  TrackSelectCatalog,
  TrackSelectTrack,
  TrackSelectView,
} from "../src/TrackSelect/schema/catalogSchema";
import {
  type TrackSelectState,
  useTrackSelectState,
} from "../src/TrackSelect/session/useTrackSelectState";

const trackSelectContentProbe = vi.hoisted(() => ({
  current: undefined as TrackSelectState | undefined,
}));

vi.mock("../src/TrackSelect/layout/trackSelectContent", async () => {
  const { useTrackSelectState } = await import("../src/TrackSelect/session/useTrackSelectState");

  return {
    TrackSelectContent: (props: Parameters<typeof useTrackSelectState>[0]) => {
      trackSelectContentProbe.current = useTrackSelectState(props);
      return null;
    },
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function Renderer() {
  return null;
}

const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: Renderer },
});

const annotationModule = defineTrackModule({
  type: "annotation",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: Renderer },
});

const defaultView: TrackSelectView = {
  id: "default",
  label: "Default",
  columns: [{ field: "title" }],
  grouping: [],
  leaf: "title",
};

const groupedView: TrackSelectView = {
  ...defaultView,
  id: "grouped",
  label: "Grouped",
  columns: [{ field: "group" }],
  grouping: ["group"],
};

function catalogTrack(id: string, group: string): TrackSelectTrack {
  return {
    type: "signal",
    id,
    title: id,
    config: { url: id },
    metadata: { group },
  };
}

const catalogs: TrackSelectCatalog[] = [
  {
    id: "alpha",
    label: "Alpha",
    views: [defaultView, groupedView],
    tracks: [catalogTrack("one", "A"), catalogTrack("two", "B"), catalogTrack("three", "A")],
  },
  {
    id: "beta",
    label: "Beta",
    views: [defaultView],
    tracks: [catalogTrack("one", "A")],
  },
];

type StateOptions = Parameters<typeof useTrackSelectState>[0];

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  container?.remove();
  container = undefined;
  root = undefined;
  trackSelectContentProbe.current = undefined;
});

function createTrack(id: string) {
  return signalModule.create({ id, title: id, config: { url: id } });
}

function createStore(trackIds: string[] = [], tracks?: TrackStore["tracks"]) {
  return createTrackStore({
    modules: [signalModule, annotationModule],
    tracks: tracks ?? trackIds.map(createTrack),
  });
}

async function renderUi(ui: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(ui));
}

async function rerenderUi(ui: ReactNode) {
  await act(async () => root?.render(ui));
}

async function renderState(options: StateOptions) {
  let current: TrackSelectState | undefined;

  function Harness() {
    current = useTrackSelectState(options);
    return null;
  }

  await renderUi(<Harness />);
  return {
    get current() {
      if (!current) throw new Error("TrackSelect state did not render");
      return current;
    },
  };
}

function createStateOptions({
  trackIds = [],
  defaultTrackIds,
  maxTracks = 10,
  setTracks,
  tracks,
}: {
  trackIds?: string[];
  defaultTrackIds?: readonly string[];
  maxTracks?: number;
  setTracks?: TrackStore["setTracks"];
  tracks?: TrackStore["tracks"];
} = {}) {
  const store = createStore(trackIds, tracks);
  const onClose = vi.fn();
  const commitTracks = setTracks ?? vi.fn(store.getState().setTracks);

  return {
    store,
    onClose,
    setTracks: commitTracks,
    options: {
      trackCatalogs: catalogs,
      tracks: store.getState().tracks,
      registry: store.getState().registry,
      setTracks: commitTracks,
      defaultTrackIds,
      maxTracks,
      onClose,
    } satisfies StateOptions,
  };
}

function selectedIds(state: TrackSelectState, catalogId: string) {
  return Array.from(state.state.selectedByCatalog.get(catalogId) ?? []);
}

function getTrackSelectContentState() {
  if (!trackSelectContentProbe.current) {
    throw new Error("TrackSelect content did not render");
  }
  return trackSelectContentProbe.current;
}

describe("TrackSelect session workflow", () => {
  it("keeps draft edits out of the store", async () => {
    const setup = createStateOptions({ trackIds: ["unmanaged", "alpha::one"] });
    const result = await renderState(setup.options);

    expect(selectedIds(result.current, "alpha")).toEqual(["alpha::one"]);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::two"]));
    });

    expect(selectedIds(result.current, "alpha")).toEqual(["alpha::two"]);
    expect(setup.store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    expect(setup.setTracks).not.toHaveBeenCalled();
  });

  it("submits once in active-view order and preserves non-catalog tracks", async () => {
    const setup = createStateOptions({ trackIds: ["unmanaged"] });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectCatalog("alpha");
      result.current.actions.selectView("grouped");
    });
    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(
        new Set(["alpha::one", "alpha::two", "alpha::three"]),
      );
      result.current.actions.selectCatalog("beta");
    });
    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["beta::one"]));
    });
    await act(async () => result.current.actions.submitSelection());

    expect(setup.setTracks).toHaveBeenCalledOnce();
    expect(setup.store.getState().order).toEqual([
      "unmanaged",
      "alpha::one",
      "alpha::three",
      "alpha::two",
      "beta::one",
    ]);
    expect(setup.onClose).toHaveBeenCalledOnce();
  });

  it("resets the draft to the exact configured default order", async () => {
    const setup = createStateOptions({
      trackIds: ["unmanaged", "alpha::one"],
      defaultTrackIds: ["beta::one", "alpha::two"],
    });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::three"]));
      result.current.actions.resetDraftSelection();
    });

    expect(setup.store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    await act(async () => result.current.actions.submitSelection());
    expect(setup.store.getState().order).toEqual(["unmanaged", "beta::one", "alpha::two"]);
  });

  it("clears either the active catalog or the complete draft", async () => {
    const setup = createStateOptions({ trackIds: ["alpha::one", "beta::one"] });
    const result = await renderState(setup.options);

    await act(async () => result.current.actions.selectCatalog("alpha"));
    await act(async () => result.current.actions.clearDraftSelection());

    expect(selectedIds(result.current, "alpha")).toEqual([]);
    expect(selectedIds(result.current, "beta")).toEqual(["beta::one"]);

    await act(async () => result.current.actions.backToCatalogs());
    await act(async () => result.current.actions.clearDraftSelection());

    expect(result.current.state.selectedTrackCount).toBe(0);
    expect(setup.store.getState().order).toEqual(["alpha::one", "beta::one"]);

    await act(async () => result.current.actions.submitSelection());

    expect(setup.store.getState().order).toEqual([]);
    expect(setup.onClose).toHaveBeenCalledOnce();
  });

  it("reuses an existing track whose ID is reserved by the catalog", async () => {
    const existingTrack = annotationModule.create({
      id: "alpha::one",
      title: "Unrelated annotation",
      config: { url: "annotation" },
    });
    const setup = createStateOptions({ tracks: [existingTrack] });
    const result = await renderState(setup.options);

    expect(selectedIds(result.current, "alpha")).toEqual(["alpha::one"]);

    await act(async () => result.current.actions.submitSelection());

    expect(setup.store.getState().tracks).toEqual([existingTrack]);
    expect(setup.onClose).toHaveBeenCalledOnce();
  });

  it("rejects draft growth beyond the track limit", async () => {
    const setup = createStateOptions({ trackIds: ["beta::one"], maxTracks: 1 });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::one"]));
    });

    expect(selectedIds(result.current, "alpha")).toEqual([]);
    expect(selectedIds(result.current, "beta")).toEqual(["beta::one"]);
    expect(result.current.state.limitDialogOpen).toBe(true);
    expect(setup.setTracks).not.toHaveBeenCalled();
  });

  it("surfaces a store rejection without closing", async () => {
    const rejectedSetTracks: TrackStore["setTracks"] = () => ({
      ok: false,
      error: "Store rejected the update",
    });
    const setup = createStateOptions({
      trackIds: ["unmanaged"],
      setTracks: vi.fn(rejectedSetTracks),
    });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::one"]));
    });
    await act(async () => result.current.actions.submitSelection());

    expect(result.current.state.submitError).toBe("Store rejected the update");
    expect(setup.setTracks).toHaveBeenCalledOnce();
    expect(setup.onClose).not.toHaveBeenCalled();
  });
});

describe("TrackSelect default initialization", () => {
  it("leaves the store unchanged when defaults are undefined", async () => {
    const store = createStore(["unmanaged", "alpha::one"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });

    await renderUi(
      <TrackSelect open onClose={vi.fn()} trackCatalogs={catalogs} useTrackStore={store} />,
    );

    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    expect(setTracks).not.toHaveBeenCalled();
  });

  it("treats an empty default list as explicit initialization", async () => {
    const store = createStore(["unmanaged", "alpha::one", "beta::one"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });

    await renderUi(
      <TrackSelect
        open
        onClose={vi.fn()}
        trackCatalogs={catalogs}
        useTrackStore={store}
        defaultTrackIds={[]}
      />,
    );

    expect(store.getState().order).toEqual(["unmanaged"]);
    expect(setTracks).toHaveBeenCalledOnce();
  });

  it("treats reserved IDs as catalog-owned during initialization", async () => {
    const store = createStore(["unmanaged", "alpha::one"]);
    const reservedTrack = store.getState().getTrack("alpha::one");
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });
    const defaults = ["beta::one", "alpha::two"];
    const onClose = vi.fn();
    const props = {
      open: true,
      onClose,
      trackCatalogs: catalogs,
      useTrackStore: store,
      defaultTrackIds: defaults,
    };

    await renderUi(<TrackSelect {...props} />);

    expect(store.getState().order).toEqual(["unmanaged", ...defaults]);
    expect(store.getState().tracks).not.toContain(reservedTrack);
    expect(setTracks).toHaveBeenCalledOnce();
    expect(selectedIds(getTrackSelectContentState(), "alpha")).toEqual(["alpha::two"]);
    expect(selectedIds(getTrackSelectContentState(), "beta")).toEqual(["beta::one"]);

    await rerenderUi(<TrackSelect {...props} trackCatalogs={[...catalogs]} />);
    expect(setTracks).toHaveBeenCalledOnce();

    await act(async () => {
      store.getState().addTrack(createTrack("later"));
    });
    expect(store.getState().order).toEqual(["unmanaged", ...defaults, "later"]);
    expect(setTracks).toHaveBeenCalledOnce();

    await act(async () => {
      getTrackSelectContentState().actions.selectActiveCatalogTracks(new Set(["alpha::three"]));
      getTrackSelectContentState().actions.cancel();
    });

    expect(selectedIds(getTrackSelectContentState(), "alpha")).toEqual(["alpha::three"]);
    expect(onClose).toHaveBeenCalledOnce();

    await rerenderUi(<TrackSelect {...props} open={false} />);
    await rerenderUi(<TrackSelect {...props} />);

    expect(selectedIds(getTrackSelectContentState(), "alpha")).toEqual(["alpha::two"]);
    expect(selectedIds(getTrackSelectContentState(), "beta")).toEqual(["beta::one"]);
    expect(store.getState().order).toEqual(["unmanaged", ...defaults, "later"]);
    expect(setTracks).toHaveBeenCalledOnce();
  });

  it("reinitializes when defaults change by value", async () => {
    const store = createStore(["unmanaged"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });
    const props = {
      open: true,
      onClose: vi.fn(),
      trackCatalogs: catalogs,
      useTrackStore: store,
    };

    await renderUi(<TrackSelect {...props} defaultTrackIds={["alpha::one"]} />);
    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);

    await rerenderUi(<TrackSelect {...props} defaultTrackIds={["alpha::one"]} />);
    expect(setTracks).toHaveBeenCalledOnce();

    await rerenderUi(<TrackSelect {...props} defaultTrackIds={["beta::one", "alpha::two"]} />);

    expect(store.getState().order).toEqual(["unmanaged", "beta::one", "alpha::two"]);
    expect(setTracks).toHaveBeenCalledTimes(2);
  });

  it("initializes a replacement store with the same defaults", async () => {
    const defaults = ["beta::one", "alpha::two"];
    const firstStore = createStore(["first"]);
    const secondStore = createStore(["second"]);
    const firstSetTracks = vi.fn(firstStore.getState().setTracks);
    const secondSetTracks = vi.fn(secondStore.getState().setTracks);
    firstStore.setState({ setTracks: firstSetTracks });
    secondStore.setState({ setTracks: secondSetTracks });
    const props = {
      open: true,
      onClose: vi.fn(),
      trackCatalogs: catalogs,
      defaultTrackIds: defaults,
    };

    await renderUi(<TrackSelect {...props} useTrackStore={firstStore} />);
    expect(firstStore.getState().order).toEqual(["first", ...defaults]);

    await rerenderUi(<TrackSelect {...props} useTrackStore={secondStore} />);

    expect(secondStore.getState().order).toEqual(["second", ...defaults]);
    expect(firstSetTracks).toHaveBeenCalledOnce();
    expect(secondSetTracks).toHaveBeenCalledOnce();
  });

  it("reinitializes the same store after a component remount", async () => {
    const store = createStore(["unmanaged"]);
    const commitTracks = store.getState().setTracks;
    const setTracks = vi.fn(commitTracks);
    store.setState({ setTracks });
    const props = {
      open: true,
      onClose: vi.fn(),
      trackCatalogs: catalogs,
      useTrackStore: store,
      defaultTrackIds: ["alpha::one"],
    };

    await renderUi(<TrackSelect key="first" {...props} />);
    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);

    await act(async () => {
      commitTracks([createTrack("unmanaged"), createTrack("alpha::three")]);
    });
    expect(store.getState().order).toEqual(["unmanaged", "alpha::three"]);

    await rerenderUi(<TrackSelect key="second" {...props} />);

    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    expect(setTracks).toHaveBeenCalledTimes(2);
  });
});
