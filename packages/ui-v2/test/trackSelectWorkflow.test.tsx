// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createTrackStore,
  defineTrackModule,
  type TrackInteraction,
  type TrackRuntimeContext,
  type TrackStore,
} from "../../v2/src/lib";
import type { TrackSelectInteraction, TrackSelectInteractionResolver } from "../src/lib";
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

type SignalItem = { id: string };
type SignalConfig = { url: string };

function Renderer() {
  return null;
}

const signalModule = defineTrackModule<SignalItem>()({
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
  onCommittedTrackIds = vi.fn(),
  trackCatalogs = catalogs,
  resolveTrackInteraction,
}: {
  trackIds?: string[];
  defaultTrackIds?: readonly string[];
  maxTracks?: number;
  setTracks?: TrackStore["setTracks"];
  tracks?: TrackStore["tracks"];
  onCommittedTrackIds?: (trackIds: readonly string[]) => void;
  trackCatalogs?: TrackSelectCatalog[];
  resolveTrackInteraction?: TrackSelectInteractionResolver;
} = {}) {
  const store = createStore(trackIds, tracks);
  const onClose = vi.fn();
  const commitTracks = setTracks ?? vi.fn(store.getState().setTracks);

  return {
    store,
    onClose,
    onCommittedTrackIds,
    setTracks: commitTracks,
    options: {
      trackCatalogs,
      tracks: store.getState().tracks,
      registry: store.getState().registry,
      setTracks: commitTracks,
      defaultTrackIds,
      onCommittedTrackIds,
      maxTracks,
      onClose,
      resolveTrackInteraction,
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
    vi.mocked(setup.onCommittedTrackIds).mockImplementation(() => {
      expect(setup.store.getState().order).toEqual([
        "unmanaged",
        "alpha::one",
        "alpha::three",
        "alpha::two",
        "beta::one",
      ]);
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
    expect(setup.onCommittedTrackIds).toHaveBeenCalledOnce();
    expect(setup.onCommittedTrackIds).toHaveBeenCalledWith([
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

  it("resets to an empty catalog selection when defaults are absent", async () => {
    const setup = createStateOptions({ trackIds: ["unmanaged", "alpha::one"] });
    const result = await renderState(setup.options);

    await act(async () => result.current.actions.resetDraftSelection());

    expect(result.current.state.selectedTrackCount).toBe(0);
    expect(setup.store.getState().order).toEqual(["unmanaged", "alpha::one"]);

    await act(async () => result.current.actions.submitSelection());

    expect(setup.store.getState().order).toEqual(["unmanaged"]);
    expect(setup.onCommittedTrackIds).toHaveBeenCalledWith([]);
  });

  it("does not report draft changes or cancellation as a commit", async () => {
    const setup = createStateOptions({
      trackIds: ["alpha::one"],
      defaultTrackIds: ["beta::one"],
    });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::two"]));
      result.current.actions.clearDraftSelection();
      result.current.actions.resetDraftSelection();
      result.current.actions.cancel();
    });

    expect(setup.store.getState().order).toEqual(["alpha::one"]);
    expect(setup.onCommittedTrackIds).not.toHaveBeenCalled();
    expect(setup.onClose).toHaveBeenCalledOnce();
  });

  it("does not resolve interactions for draft actions or cancellation", async () => {
    const resolveTrackInteraction = vi.fn<TrackSelectInteractionResolver>();
    const setup = createStateOptions({
      trackIds: ["alpha::one"],
      defaultTrackIds: ["beta::one"],
      resolveTrackInteraction,
    });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::two"]));
      result.current.actions.clearDraftSelection();
      result.current.actions.resetDraftSelection();
      result.current.actions.cancel();
    });

    expect(resolveTrackInteraction).not.toHaveBeenCalled();
    expect(setup.setTracks).not.toHaveBeenCalled();
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
    expect(setup.onCommittedTrackIds).not.toHaveBeenCalled();
    expect(setup.onClose).not.toHaveBeenCalled();
  });

  it("does not report a commit when track creation fails", async () => {
    const trackCatalogs = structuredClone(catalogs);
    const setup = createStateOptions({ trackCatalogs });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::one"]));
    });
    trackCatalogs[0]!.tracks[0]!.config = { url: "" };
    await act(async () => result.current.actions.submitSelection());

    expect(result.current.state.submitError).toMatch(/signal input is invalid/);
    expect(setup.setTracks).not.toHaveBeenCalled();
    expect(setup.onCommittedTrackIds).not.toHaveBeenCalled();
    expect(setup.onClose).not.toHaveBeenCalled();
  });

  it("forwards current runtime state and catalog context without rerunning the resolver", async () => {
    const onClick = vi.fn();
    const interaction: TrackSelectInteraction<SignalItem, SignalConfig> = { onClick };
    const resolveTrackInteraction: TrackSelectInteractionResolver = vi.fn(() => interaction);
    const setup = createStateOptions({ trackIds: ["unmanaged"], resolveTrackInteraction });
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::one"]));
    });
    await act(async () => result.current.actions.submitSelection());

    expect(resolveTrackInteraction).toHaveBeenCalledOnce();
    expect(
      setup.store.getState().updateConfig<SignalConfig>("alpha::one", { url: "updated-url" }),
    ).toEqual({ ok: true });
    expect(setup.store.getState().updateBase("alpha::one", { color: "#abcdef" })).toEqual({
      ok: true,
    });

    const track = setup.store.getState().getTrack("alpha::one")!;
    const runtime: TrackRuntimeContext<SignalConfig> = {
      type: track.type,
      base: track.base,
      config: track.config as SignalConfig,
    };
    const coreInteraction = track.interaction as TrackInteraction<SignalItem, SignalConfig>;
    coreInteraction.onClick?.({ id: "semantic-item" }, runtime);

    expect(onClick).toHaveBeenCalledWith({ id: "semantic-item" }, runtime, {
      catalogId: "alpha",
      authoredTrackId: "one",
      metadata: { group: "A" },
    });
    expect(runtime.config.url).toBe("updated-url");
    expect(runtime.base.color).toBe("#abcdef");
    expect(resolveTrackInteraction).toHaveBeenCalledOnce();
    expect(track).not.toHaveProperty("metadata");
  });

  it("keeps resolver failures atomic and visible", async () => {
    const setup = createStateOptions({
      trackIds: ["unmanaged"],
      resolveTrackInteraction: () => {
        throw new Error("Resolver failed");
      },
    });
    const originalTracks = setup.store.getState().tracks;
    const result = await renderState(setup.options);

    await act(async () => {
      result.current.actions.selectActiveCatalogTracks(new Set(["alpha::one"]));
    });
    await act(async () => result.current.actions.submitSelection());

    expect(result.current.state.submitError).toBe("Resolver failed");
    expect(setup.store.getState().tracks).toBe(originalTracks);
    expect(setup.setTracks).not.toHaveBeenCalled();
    expect(setup.onCommittedTrackIds).not.toHaveBeenCalled();
    expect(setup.onClose).not.toHaveBeenCalled();
  });
});

describe("TrackSelect initialization", () => {
  it("leaves the store unchanged when initial tracks and defaults are undefined", async () => {
    const store = createStore(["unmanaged", "alpha::one"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });

    await renderUi(
      <TrackSelect open onClose={vi.fn()} trackCatalogs={catalogs} useTrackStore={store} />,
    );

    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    expect(setTracks).not.toHaveBeenCalled();
  });

  it("uses explicit initial tracks instead of defaults", async () => {
    const store = createStore(["unmanaged"]);
    const setTracks = vi.fn(store.getState().setTracks);
    const onCommittedTrackIds = vi.fn();
    store.setState({ setTracks });

    await renderUi(
      <TrackSelect
        open
        onClose={vi.fn()}
        trackCatalogs={catalogs}
        useTrackStore={store}
        initialTrackIds={["alpha::one"]}
        defaultTrackIds={["beta::one"]}
        onCommittedTrackIds={onCommittedTrackIds}
      />,
    );

    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    expect(onCommittedTrackIds).not.toHaveBeenCalled();

    await act(async () => getTrackSelectContentState().actions.resetDraftSelection());
    expect(selectedIds(getTrackSelectContentState(), "alpha")).toEqual([]);
    expect(selectedIds(getTrackSelectContentState(), "beta")).toEqual(["beta::one"]);
  });

  it("resolves interactions for new and reused initial tracks", async () => {
    const existingInteraction = { onHover: vi.fn() };
    const existingTrack = signalModule.create(
      { id: "alpha::one", title: "Existing", config: { url: "existing" } },
      existingInteraction,
    );
    const store = createStore([], [createTrack("unmanaged"), existingTrack]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });
    const replacement = { onClick: vi.fn() };
    const resolveTrackInteraction = vi.fn<TrackSelectInteractionResolver>(() => replacement);

    await renderUi(
      <TrackSelect
        open
        onClose={vi.fn()}
        trackCatalogs={catalogs}
        useTrackStore={store}
        defaultTrackIds={["alpha::one", "beta::one"]}
        resolveTrackInteraction={resolveTrackInteraction}
      />,
    );

    expect(resolveTrackInteraction).toHaveBeenCalledTimes(2);
    expect(resolveTrackInteraction.mock.calls.map(([entry]) => entry.qualifiedTrackId)).toEqual([
      "alpha::one",
      "beta::one",
    ]);
    expect(store.getState().getTrack("alpha::one")).not.toBe(existingTrack);
    expect(store.getState().getTrack("alpha::one")?.interaction).toHaveProperty("onClick");
    expect(store.getState().getTrack("alpha::one")?.interaction).not.toHaveProperty("onHover");
    expect(store.getState().getTrack("beta::one")?.interaction).toHaveProperty("onClick");
    expect(store.getState().getTrack("unmanaged")).toBeDefined();
  });

  it("does not reinitialize when only resolver identity changes", async () => {
    const store = createStore(["unmanaged"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });
    const firstResolver = vi.fn<TrackSelectInteractionResolver>(() => ({ onClick: vi.fn() }));
    const secondResolver = vi.fn<TrackSelectInteractionResolver>(() => ({ onHover: vi.fn() }));
    const props = {
      open: true,
      onClose: vi.fn(),
      trackCatalogs: catalogs,
      useTrackStore: store,
      defaultTrackIds: ["alpha::one"],
    };

    await renderUi(<TrackSelect {...props} resolveTrackInteraction={firstResolver} />);
    const initializedTrack = store.getState().getTrack("alpha::one");

    await rerenderUi(<TrackSelect {...props} resolveTrackInteraction={secondResolver} />);

    expect(firstResolver).toHaveBeenCalledOnce();
    expect(secondResolver).not.toHaveBeenCalled();
    expect(setTracks).toHaveBeenCalledOnce();
    expect(store.getState().getTrack("alpha::one")).toBe(initializedTrack);
  });

  it("validates defaults when explicit initial tracks take precedence", async () => {
    const store = createStore(["unmanaged"]);

    await expect(
      renderUi(
        <TrackSelect
          open
          onClose={vi.fn()}
          trackCatalogs={catalogs}
          useTrackStore={store}
          initialTrackIds={["alpha::one"]}
          defaultTrackIds={["alpha::missing"]}
        />,
      ),
    ).rejects.toThrow("Unknown track selection id: alpha::missing");
  });

  it("reports invalid explicit initial tracks as an initial selection error", async () => {
    const store = createStore(["unmanaged"]);

    await expect(
      renderUi(
        <TrackSelect
          open
          onClose={vi.fn()}
          trackCatalogs={catalogs}
          useTrackStore={store}
          initialTrackIds={["alpha::missing"]}
        />,
      ),
    ).rejects.toThrow("Unknown track selection id: alpha::missing");
  });

  it("treats an empty initial list as explicit initialization", async () => {
    const store = createStore(["unmanaged", "alpha::one"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });

    await renderUi(
      <TrackSelect
        open
        onClose={vi.fn()}
        trackCatalogs={catalogs}
        useTrackStore={store}
        initialTrackIds={[]}
        defaultTrackIds={["beta::one"]}
      />,
    );

    expect(store.getState().order).toEqual(["unmanaged"]);
    expect(setTracks).toHaveBeenCalledOnce();
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

  it("changes the reset target without reinitializing explicit initial tracks", async () => {
    const store = createStore(["unmanaged"]);
    const setTracks = vi.fn(store.getState().setTracks);
    store.setState({ setTracks });
    const props = {
      open: true,
      onClose: vi.fn(),
      trackCatalogs: catalogs,
      useTrackStore: store,
      initialTrackIds: ["alpha::one"],
    };

    await renderUi(<TrackSelect {...props} defaultTrackIds={["beta::one"]} />);
    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);

    await rerenderUi(<TrackSelect {...props} defaultTrackIds={["alpha::two"]} />);

    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);
    expect(setTracks).toHaveBeenCalledOnce();

    await act(async () => getTrackSelectContentState().actions.resetDraftSelection());
    expect(selectedIds(getTrackSelectContentState(), "alpha")).toEqual(["alpha::two"]);
  });

  it("reinitializes when the same defaults return after being removed", async () => {
    const store = createStore(["unmanaged"]);
    const commitTracks = store.getState().setTracks;
    const setTracks = vi.fn(commitTracks);
    store.setState({ setTracks });
    const props = {
      open: true,
      onClose: vi.fn(),
      trackCatalogs: catalogs,
      useTrackStore: store,
    };

    await renderUi(<TrackSelect {...props} defaultTrackIds={["alpha::one"]} />);
    await rerenderUi(<TrackSelect {...props} />);
    await act(async () => {
      commitTracks([createTrack("unmanaged"), createTrack("beta::one")]);
    });

    await rerenderUi(<TrackSelect {...props} defaultTrackIds={["alpha::one"]} />);

    expect(store.getState().order).toEqual(["unmanaged", "alpha::one"]);
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
