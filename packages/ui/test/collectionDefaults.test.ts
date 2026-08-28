import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createModuleRegistry,
  defineTrackModule,
  type TrackInteraction,
  type TrackRuntimeContext,
} from "@weng-lab/genomebrowser";
import type {
  AnyTrackSelectInteraction,
  TrackSelectInteraction,
  TrackSelectInteractionResolver,
} from "../src/lib";
import {
  clearOrderedSelection,
  createOrderedSelectionFromTracks,
  createSelectionByCollection,
  removeOrderedTrackIds,
  setOrderedCollectionSelection,
} from "../src/TrackSelect/collection/collectionSelection";
import { getReconciledTracks } from "../src/TrackSelect/collection/collectionStore";
import type {
  TrackSelectCollection,
  TrackSelectView,
} from "../src/TrackSelect/schema/collectionSchema";

function Renderer() {
  return null;
}

type SignalItem = { id: string };
type SignalConfig = { url: string };

const signalModule = defineTrackModule<SignalItem>()({
  type: "signal",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: Renderer },
});
const registry = createModuleRegistry([signalModule]);

const defaultView: TrackSelectView = {
  id: "default",
  label: "Default",
  columns: [{ field: "title" }],
  grouping: [],
  leaf: "title",
};

const collections: TrackSelectCollection[] = [
  {
    id: "alpha",
    label: "Alpha",
    views: [defaultView],
    tracks: [
      {
        type: "signal",
        id: "one",
        title: "Alpha one",
        config: { url: "alpha-one" },
        metadata: {},
      },
      {
        type: "signal",
        id: "two",
        title: "Alpha two",
        config: { url: "alpha-two" },
        metadata: {},
      },
    ],
  },
  {
    id: "beta",
    label: "Beta",
    views: [defaultView],
    tracks: [
      {
        type: "signal",
        id: "one",
        title: "Beta one",
        config: { url: "beta-one" },
        metadata: {},
      },
    ],
  },
];

describe("TrackSelect default track reconciliation", () => {
  it("preserves non-collection tracks and applies the exact cross-collection order", () => {
    const unmanagedTrack = signalModule.create({
      id: "unmanaged",
      title: "Unmanaged",
      config: { url: "unmanaged" },
    });
    const existingDefault = signalModule.create({
      id: "alpha::one",
      title: "Existing alpha one",
      config: { url: "existing" },
    });
    const unselectedCollectionTrack = signalModule.create({
      id: "alpha::two",
      title: "Unselected alpha two",
      config: { url: "unselected" },
    });

    const nextTracks = getReconciledTracks({
      trackCollections: collections,
      tracks: [existingDefault, unmanagedTrack, unselectedCollectionTrack],
      selectedTrackIds: ["beta::one", "alpha::one"],
      registry,
      maxTracks: 10,
    });

    expect(nextTracks.map((track) => track.base.id)).toEqual([
      "unmanaged",
      "beta::one",
      "alpha::one",
    ]);
    expect(nextTracks.map((track) => track.source)).toEqual(["user", "host", "host"]);
    expect(nextTracks[2]).not.toBe(existingDefault);
    expect(nextTracks[2]).toMatchObject({
      type: existingDefault.type,
      base: existingDefault.base,
      config: existingDefault.config,
    });
    expect(nextTracks).not.toContain(unselectedCollectionTrack);
  });

  it("treats an empty default list as an authoritative collection clear", () => {
    const unmanagedTrack = signalModule.create({
      id: "unmanaged",
      title: "Unmanaged",
      config: { url: "unmanaged" },
    });
    const collectionTrack = signalModule.create({
      id: "alpha::one",
      title: "Alpha one",
      config: { url: "alpha-one" },
    });

    const nextTracks = getReconciledTracks({
      trackCollections: collections,
      tracks: [collectionTrack, unmanagedTrack],
      selectedTrackIds: [],
      registry,
      maxTracks: 10,
    });

    expect(nextTracks).toEqual([unmanagedTrack]);
  });

  it("rejects duplicate, unknown, and over-limit defaults", () => {
    const options = {
      trackCollections: collections,
      tracks: [],
      registry,
      maxTracks: 2,
    };

    expect(() =>
      getReconciledTracks({
        ...options,
        selectedTrackIds: ["alpha::one", "alpha::one"],
      }),
    ).toThrow("Duplicate track selection id: alpha::one");
    expect(() => getReconciledTracks({ ...options, selectedTrackIds: ["alpha::missing"] })).toThrow(
      "Unknown track selection id: alpha::missing",
    );
    expect(() =>
      getReconciledTracks({
        ...options,
        selectedTrackIds: ["alpha::one", "alpha::two", "beta::one"],
      }),
    ).toThrow("Track selection count 3 exceeds the maximum of 2");
  });

  it("resolves new track interactions with owning collection context", () => {
    const onClick = vi.fn();
    const interaction: TrackSelectInteraction<unknown, unknown> = {
      onClick(item, runtime, collection) {
        if (
          !isRecord(item) ||
          typeof item.id !== "string" ||
          !isRecord(runtime.config) ||
          typeof runtime.config.url !== "string"
        ) {
          return;
        }
        onClick(item, runtime, collection);
      },
    };
    const resolveTrackInteraction: TrackSelectInteractionResolver = vi.fn(() => interaction);

    const [track] = getReconciledTracks({
      trackCollections: collections,
      tracks: [],
      selectedTrackIds: ["beta::one"],
      registry,
      maxTracks: 10,
      resolveTrackInteraction,
    });

    expect(resolveTrackInteraction).toHaveBeenCalledWith({
      collectionId: "beta",
      qualifiedTrackId: "beta::one",
      track: collections[1]!.tracks[0],
    });
    expect(track).not.toHaveProperty("metadata");
    expect(track.config).not.toHaveProperty("metadata");
    expect(track.base).not.toHaveProperty("metadata");

    const runtime: TrackRuntimeContext<SignalConfig> = {
      type: "signal",
      base: { ...track.base, color: "#123456" },
      config: { url: "current-url" },
    };
    const coreInteraction = track.interaction as TrackInteraction<SignalItem, SignalConfig>;
    coreInteraction.onClick?.({ id: "item" }, runtime);

    expect(onClick).toHaveBeenCalledWith({ id: "item" }, runtime, {
      collectionId: "beta",
      authoredTrackId: "one",
      metadata: {},
    });
  });

  it("preserves, replaces, or clears reused interactions according to resolver presence", () => {
    const unmanagedInteraction = { onClick: vi.fn() };
    const existingInteraction = { onHover: vi.fn(), onLeave: vi.fn() };
    const unmanagedTrack = signalModule.create(
      { id: "unmanaged", title: "Unmanaged", config: { url: "unmanaged" } },
      unmanagedInteraction,
    );
    const existingTrack = signalModule.create(
      { id: "alpha::one", title: "Existing", config: { url: "existing" } },
      existingInteraction,
    );

    const preserved = getReconciledTracks({
      trackCollections: collections,
      tracks: [unmanagedTrack, existingTrack],
      selectedTrackIds: ["alpha::one"],
      registry,
      maxTracks: 10,
    });
    expect(preserved[0]).toBe(unmanagedTrack);
    expect(preserved[1]).not.toBe(existingTrack);
    expect(preserved[1]).toMatchObject({
      type: existingTrack.type,
      base: existingTrack.base,
      config: existingTrack.config,
    });
    expect(preserved[1]!.source).toBe("host");
    expect(preserved[1]!.interaction).toBe(existingTrack.interaction);

    const replacement = { onClick: vi.fn() };
    const replaced = getReconciledTracks({
      trackCollections: collections,
      tracks: [unmanagedTrack, existingTrack],
      selectedTrackIds: ["alpha::one"],
      registry,
      maxTracks: 10,
      resolveTrackInteraction: () => replacement,
    });
    expect(replaced[0]).toBe(unmanagedTrack);
    expect(replaced[0]!.interaction).toBe(unmanagedTrack.interaction);
    expect(replaced[1]).not.toBe(existingTrack);
    expect(replaced[1]!.interaction).toHaveProperty("onClick");
    expect(replaced[1]!.interaction).not.toHaveProperty("onHover");
    expect(replaced[1]!.interaction).not.toHaveProperty("onLeave");

    const cleared = getReconciledTracks({
      trackCollections: collections,
      tracks: [unmanagedTrack, existingTrack],
      selectedTrackIds: ["alpha::one"],
      registry,
      maxTracks: 10,
      resolveTrackInteraction: () => undefined,
    });
    expect(cleared[0]).toBe(unmanagedTrack);
    expect(cleared[1]).not.toHaveProperty("interaction");
  });

  it("rejects invalid resolver output before returning reconciled tracks", () => {
    expect(() =>
      getReconciledTracks({
        trackCollections: collections,
        tracks: [],
        selectedTrackIds: ["alpha::one"],
        registry,
        maxTracks: 10,
        resolveTrackInteraction: () =>
          ({ onClick: "not a function" }) as unknown as AnyTrackSelectInteraction,
      }),
    ).toThrow("TrackSelect interaction onClick must be a function");
  });

  it.each([null, false])("rejects falsy non-undefined resolver output: %s", (invalidValue) => {
    expect(() =>
      getReconciledTracks({
        trackCollections: collections,
        tracks: [],
        selectedTrackIds: ["alpha::one"],
        registry,
        maxTracks: 10,
        resolveTrackInteraction: () => invalidValue as unknown as AnyTrackSelectInteraction,
      }),
    ).toThrow("TrackSelect interaction must be an object");
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

describe("TrackSelect ordered draft selection", () => {
  it("derives collection selections without losing store order", () => {
    const orderedIds = createOrderedSelectionFromTracks(collections, [
      { base: { id: "beta::one" } },
      { base: { id: "unmanaged" } },
      { base: { id: "alpha::one" } },
    ]);
    const selectedByCollection = createSelectionByCollection(collections, orderedIds);

    expect(orderedIds).toEqual(["beta::one", "alpha::one"]);
    expect(Array.from(selectedByCollection.get("alpha") ?? [])).toEqual(["alpha::one"]);
    expect(Array.from(selectedByCollection.get("beta") ?? [])).toEqual(["beta::one"]);
  });

  it("preserves surviving tracks and appends additions in active-view order", () => {
    const next = setOrderedCollectionSelection({
      selectedTrackIds: ["beta::one", "alpha::one"],
      collection: collections[0],
      view: defaultView,
      selectedIds: new Set(["alpha::two", "alpha::one"]),
    });

    expect(next).toEqual(["beta::one", "alpha::one", "alpha::two"]);
  });

  it("clears and removes tracks without disturbing remaining order", () => {
    const selectedIds = ["alpha::one", "beta::one", "alpha::two"];

    expect(clearOrderedSelection(selectedIds, collections[0])).toEqual(["beta::one"]);
    expect(clearOrderedSelection(selectedIds)).toEqual([]);
    expect(removeOrderedTrackIds(selectedIds, ["beta::one"])).toEqual(["alpha::one", "alpha::two"]);
  });
});
