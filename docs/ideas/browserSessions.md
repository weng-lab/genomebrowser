# Browser Session Factory Cookbook

## What this pattern is

A browser session is a small, disposable object that owns one genome browser's runtime state:

- its browser store and current region;
- its track store, registered modules, and fixed tracks;
- coordination between tracks, such as Manhattan-to-LD hover behavior;
- subscriptions and caches associated with that browser instance; and
- cleanup for everything it creates.

The React component owns the session's lifetime, while presentation components receive the stores explicitly. Portal-specific factories describe what each browser means without putting that configuration into the shared view.

In this project, the shape is approximately:

```ts
type GenomeBrowserSession = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  setRegion(region: BrowserRegion): void;
  dispose(): void;
};
```

This is an application integration pattern, not a requirement of React or the genome browser library.

## Why use it

A genome browser is more than a component tree. It combines long-lived stores, asynchronous data loading, user selections, cross-track interactions, and resources that require cleanup. Treating those pieces as unrelated globals creates hidden coupling:

- changing tracks in one portal can affect another portal;
- a pinned interaction can survive navigation to an unrelated region;
- route-specific configuration gets spread across components;
- stores can be recreated on every render; and
- cleanup becomes easy to forget.

A session gives that state one explicit owner and lifetime. It is similar to opening a document, editor, map, or media-player session: create it once, operate on it, and dispose it when its owner goes away.

## The ownership boundary

The useful split is:

### The session owns runtime behavior

- browser and track stores;
- the registered module set;
- fixed tracks that are not collection-managed;
- cross-track coordination;
- region-dependent transient state;
- subscriptions, caches, and cleanup.

### The portal factory owns product configuration

- which fixed tracks exist;
- which dataset a fixed association track uses;
- which custom modules are available;
- stable track IDs and titles.

### The React owner owns lifetime

- creating the session once;
- forwarding route/data changes to it;
- disposing it on unmount;
- deciding whether mounted sessions should survive tab switches.

### The view owns presentation state

- rendering the browser and controls;
- opening Track Select and highlight dialogs;
- displaying loading and error states.

Track collections and default collection IDs are configuration passed to the view. They are not fixed tracks secretly inserted by the session.

## Core recipe

### 1. Create one internal session primitive

Keep the primitive focused on behavior genuinely shared by current callers. Do not turn it into a framework of flags for imagined portals.

```ts
import {
  createBrowserStore,
  createTrackStore,
  type AnyTrackModule,
  type BrowserRegion,
} from "@weng-lab/genomebrowser";

type CreateSessionOptions = {
  initialRegion: BrowserRegion;
  modules: readonly AnyTrackModule[];
  fixedTracks: AnyBrowserTrack[];
  attachInteractions?: (stores: {
    browserStore: BrowserStoreInstance;
    trackStore: TrackStoreInstance;
  }) => { reset(): void; dispose(): void };
};

function createBrowserSession({
  initialRegion,
  modules,
  fixedTracks,
  attachInteractions,
}: CreateSessionOptions): GenomeBrowserSession {
  const browserStore = createBrowserStore({
    region: initialRegion,
    marginWidth: 55,
    trackWidth: 1445,
  });

  const trackStore = createTrackStore({
    modules,
    tracks: fixedTracks,
  });

  const interactions = attachInteractions?.({ browserStore, trackStore });

  // Observe the state transition, not just one command that can cause it.
  // Search, controls, and browser-internal panning may all update this store.
  const unsubscribeRegion = browserStore.subscribe((state, previousState) => {
    if (!sameRegion(state.region, previousState.region)) {
      interactions?.reset();
    }
  });

  let disposed = false;

  return {
    browserStore,
    trackStore,
    setRegion(region) {
      browserStore.getState().setRegion(region);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeRegion();
      interactions?.dispose();
    },
  };
}

function sameRegion(a: BrowserRegion, b: BrowserRegion) {
  return a.chromosome === b.chromosome && a.start === b.start && a.end === b.end;
}
```

The types for `AnyBrowserTrack` and the interaction attachment will depend on the browser package. The important part is the ownership and cleanup, not those exact names.

### Why subscribe instead of relying only on `session.setRegion`?

`session.setRegion` is a useful public API, but it is not necessarily the only route to a region change. Search controls, zoom buttons, mouse panning, or the browser library itself may call the underlying store.

If an invariant says "LD transient state resets whenever the region changes," enforce it by observing region changes. Enforcing it only inside one command creates a bypass that future code will eventually use.

Use command methods when the command itself has unique meaning. Use subscriptions when the invariant follows from a state transition regardless of its source.

### 2. Add narrow portal factories

Portal factories should make product intent obvious and hide construction details.

```ts
export function createGenePortalSession(region: BrowserRegion) {
  const gene = createGeneTrack({ id: "gene-portal-transcripts" });
  const manhattan = createManhattanTrack({
    id: "gene-portal-gwas",
    url: BELLENGUEZ_URL,
  });
  const ld = createLdTrack({
    id: "gene-portal-ld",
    url: BELLENGUEZ_URL,
  });

  return createBrowserSession({
    initialRegion: region,
    modules: STANDARD_PORTAL_MODULES,
    fixedTracks: [gene, manhattan, ld],
    attachInteractions: ({ trackStore }) =>
      attachLDInteractions({
        useTrackStore: trackStore,
        manhattanTrackId: manhattan.base.id,
        ldTrackId: ld.base.id,
      }),
  });
}
```

An optional dataset can produce a simpler session without forcing placeholder tracks:

```ts
export function createDiseasePortalSession(region: BrowserRegion, summaryStatisticsUrl?: string) {
  const gene = createGeneTrack({ id: "disease-transcripts" });

  if (!summaryStatisticsUrl) {
    return createBrowserSession({
      initialRegion: region,
      modules: STANDARD_PORTAL_MODULES,
      fixedTracks: [gene],
    });
  }

  const manhattan = createManhattanTrack({
    id: "disease-gwas",
    url: summaryStatisticsUrl,
  });
  const ld = createLdTrack({
    id: "disease-ld",
    url: summaryStatisticsUrl,
  });

  return createBrowserSession({
    initialRegion: region,
    modules: STANDARD_PORTAL_MODULES,
    fixedTracks: [gene, manhattan, ld],
    attachInteractions: ({ trackStore }) =>
      attachLDInteractions({
        useTrackStore: trackStore,
        manhattanTrackId: manhattan.base.id,
        ldTrackId: ld.base.id,
      }),
  });
}
```

The wrapper is allowed to repeat a little configuration. A clear product boundary is usually better than one generic factory with `isDisease`, `hasAssociations`, `singleCell`, and similar boolean flags.

### 3. Own the session once in React

Do not call the factory directly during rendering. A render is not a lifetime boundary and may happen repeatedly.

```tsx
function GeneBrowserPanel({ region }: { region: BrowserRegion }) {
  const [session] = useState(() => createGenePortalSession(region));

  useEffect(() => {
    session.setRegion(region);
  }, [region, session]);

  useEffect(() => () => session.dispose(), [session]);

  return (
    <GenomeBrowserView
      browserStore={session.browserStore}
      trackStore={session.trackStore}
      trackCollections={MAIN_TRACK_COLLECTIONS}
      defaultTrackIds={GENE_DEFAULT_TRACK_IDS}
    />
  );
}
```

`useState` is appropriate here because the value is an owned, imperative resource rather than derived render data. A ref can also work, but it needs careful initialization. `useMemo` is not a lifetime guarantee and should not be used as a resource-management primitive.

### Mutable and immutable inputs

Decide which factory inputs can change without replacing the session:

- **Region** is usually mutable and can flow through `session.setRegion`.
- **Dataset identity, module registry, and fixed-track definitions** are usually construction-time inputs.

If a construction-time input changes, recreate the owning component with a stable key or explicitly replace and dispose the session. Do not silently keep association tracks connected to the previous dataset.

```tsx
<DiseaseBrowserPanel key={diseaseId} region={region} summaryStatisticsUrl={summaryStatisticsUrl} />
```

Use keys for genuine resource identity changes, not as a general way to force refreshes.

## Collection tracks and fixed tracks

The session's fixed tracks and Track Select's collection tracks have different ownership.

### Fixed tracks

Use fixed tracks for tracks that the application currently requires and that Track Select does not own, such as the gene, Manhattan, and LD tracks in this project.

### Collection tracks

Track Select creates and reconciles collection tracks using the same track store. The store must register every module type present in the collections supplied to that browser.

```ts
const STANDARD_MODULES = [bigBedModule, bigWigModule, transcriptModule];

const SINGLE_CELL_MODULES = [...STANDARD_MODULES, singleCellGrnModule, singleCellQtlModule];
```

Do not expose a collection containing `singleCellGrn` to a store that has not registered that module. Conversely, avoid registering and exposing every application module everywhere merely to make validation pass. Match registries and collections to the session's product scope.

### Defaults

Keep default collection IDs as stable, readonly configuration:

```ts
export const GRN_DEFAULT_TRACK_IDS = [
  "single-cell-interactions::grn-astrocytes",
  "single-cell-interactions::grn-endothelial",
  "single-cell-interactions::grn-vip",
] as const;
```

Pass them through the collection UI's public API:

```tsx
<GenomeBrowserView
  browserStore={session.browserStore}
  trackStore={session.trackStore}
  trackCollections={SINGLE_CELL_TRACK_COLLECTIONS}
  defaultTrackIds={GRN_DEFAULT_TRACK_IDS}
/>
```

Do not also create those tracks directly in the session. Two owners for the same tracks lead to duplicate IDs, surprising Reset behavior, and unclear ordering.

Collection-qualified IDs have the form `${collectionId}::${trackId}`. Validate them against the exact collections and module registry used by the session.

## Sessions in tabs

Tabs with different tracks should usually have different sessions. This keeps selections, regions, and interactions isolated.

```tsx
const [sessions] = useState(() => ({
  atac: createSingleCellSession(INITIAL_REGION),
  grn: createSingleCellSession(INITIAL_REGION),
  qtl: createSingleCellSession(INITIAL_REGION),
}));

useEffect(
  () => () => {
    sessions.atac.dispose();
    sessions.grn.dispose();
    sessions.qtl.dispose();
  },
  [sessions],
);
```

If Track Select reapplies defaults when it mounts, conditionally rendering the active browser can erase user changes every time a tab is revisited. A useful compromise is to mount each expensive browser lazily, then keep it mounted while hidden:

```tsx
const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([ATAC_TAB]));

function selectTab(nextTab: number) {
  setActiveTab(nextTab);
  if (isBrowserTab(nextTab)) {
    setVisited((current) => (current.has(nextTab) ? current : new Set([...current, nextTab])));
  }
}

return (
  <>
    {visited.has(ATAC_TAB) && (
      <Box display={activeTab === ATAC_TAB ? "block" : "none"}>
        <BrowserFor session={sessions.atac} defaults={ATAC_DEFAULTS} />
      </Box>
    )}
    {visited.has(GRN_TAB) && (
      <Box display={activeTab === GRN_TAB ? "block" : "none"}>
        <BrowserFor session={sessions.grn} defaults={GRN_DEFAULTS} />
      </Box>
    )}
  </>
);
```

This trades some retained memory for correct session continuity. If there can be many tabs or very heavy sessions, use an explicit eviction policy rather than accidental unmounting.

## Pros

- **Isolation:** each browser has independent region, tracks, selection, caches, and interactions.
- **Explicit ownership:** it is clear which layer creates and disposes runtime resources.
- **Portal clarity:** named factories communicate product behavior better than scattered setup.
- **Reliable cleanup:** subscriptions and cross-track handlers have one disposal path.
- **Controlled specialization:** custom modules can be registered only where they are valid.
- **Stable React behavior:** rerenders do not recreate stores or lose user state.
- **Testability:** factories and side-effect attachment can be exercised without rendering an entire portal.
- **Reusable view:** the same browser UI can render different sessions without knowing portal rules.

## Cons and tradeoffs

- **More lifecycle code:** every owner must create once and dispose correctly.
- **Imperative boundary:** stores and cleanup objects do not fit purely declarative React data flow.
- **Configuration duplication:** narrow portal factories may repeat track construction.
- **Memory retention:** keeping tab sessions mounted preserves state but retains stores, data, and SVG trees.
- **Construction-time decisions:** changing datasets or module registries usually requires replacing a session.
- **Subscription care:** state observers must compare the relevant state and unsubscribe reliably.
- **Package coupling:** the session knows browser-store and module APIs, so library upgrades may require adapting it.
- **Potential over-abstraction:** a generic session builder can become an option bag that hides rather than clarifies behavior.

These costs are justified when a browser has meaningful state or side effects. They are probably unnecessary for a single static browser with no custom interactions and no competing instances.

## Common mistakes

### Creating stores at module scope

Module-level stores become accidental singletons. Use them only when global sharing is an explicit product requirement.

### Creating a session during render

This leaks resources and resets state on rerender. Create it once at the owning component's lifetime boundary.

### Resetting side effects in only one command

Calling `interactions.reset()` only in `session.setRegion` misses search, pan, zoom, or direct store updates. Subscribe to the underlying region transition when the invariant applies to every region change.

### Forgetting disposal

Every subscription, event attachment, timer, observer, and cache with external resources should contribute to `dispose()`.

### Sharing one session between unrelated tabs

This couples selections and transient state. Share only when continuity is intentional.

### Remounting to update ordinary state

Remount only when resource identity changes. Use session methods for normal mutable values such as region.

### Giving tracks two owners

Do not create the same track as both a fixed session track and a collection default.

### Exposing collections the registry cannot construct

Track collection validation and creation depend on matching registered modules.

### Building a universal portal factory too early

Prefer a small shared primitive plus readable wrappers. Add a generalized option only after at least two real callers vary along that dimension.

## When to use this pattern

Use a session factory when one or more of these are true:

- multiple browser instances can coexist;
- portals require different fixed tracks or module registries;
- tracks coordinate hover, selection, or pin state;
- region changes invalidate caches or transient state;
- users can modify tracks and expect those changes to survive rerenders;
- browser resources need explicit cleanup.

Consider a simpler component-owned store when the browser is static, appears once, has no external side effects, and has no meaningful lifecycle beyond its component.

## Practical implementation checklist

1. Name the session's owner and lifetime.
2. Identify mutable inputs versus construction-time identity.
3. Create browser and track stores inside the factory.
4. Register only modules needed by supplied fixed tracks and collections.
5. Attach cross-track behavior inside the session.
6. Enforce transition-based invariants with store subscriptions.
7. Return explicit stores, narrow commands, and an idempotent `dispose()`.
8. Wrap the primitive with product-named factories.
9. Create each session once in its React owner.
10. Dispose it on unmount or identity replacement.
11. Keep collection defaults stable and collection-owned.
12. Decide intentionally whether tab switches preserve or destroy sessions.

## How this maps to PsychSCREEN

- `src/gb-view/stores.ts` contains the shared construction and portal factories.
- `src/gb-view/GenomeBrowserView.tsx` is the presentation boundary receiving explicit stores, collections, and defaults.
- The portal capability configuration scopes collections for each browser session.
- `src/gb-view/defaultTrackIds.ts` defines stable collection-owned defaults.
- Gene and Disease/Trait sessions attach fixed Manhattan/LD behavior.
- Single Cell sessions register the custom GRN/QTL modules.
- Single Cell browser tabs use separate sessions and retain visited browsers to preserve user changes.

The current project should evolve toward region subscriptions inside the session so LD reset behavior covers search, controls, and browser-internal navigation—not only calls made through `session.setRegion`.
