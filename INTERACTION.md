# Track Interaction Handlers

Design note for how track modules expose interaction callbacks (`onClick`, `onHover`,
`onLeave`) and where those callbacks should live.

## Problem statement

Track modules render items a user can interact with — clicking a gene on the transcript
track, hovering a point on a bigWig track. Each interaction needs an app-supplied
callback, and that callback usually needs app context: a Next.js `useRouter` to navigate
to the clicked gene's page, a query client, or some runtime-generated app data. Those
things only exist inside a React component or hook.

Today the callbacks live on the track instance:

```ts
type TrackInstance<Config, Item> = {
  type: string;
  base: TrackBase;
  config: Config;
  interaction?: TrackInteraction<Item>; // onClick / onHover / onLeave
};
```

They flow through `TrackInteractionProvider` into the renderer, which reads them via
`useInteraction<Item>()`. The store exposes an imperative `updateInteraction(id, partial)`
to change them at runtime.

Storing a **function inside otherwise-serializable per-instance state** is the root
problem, and it produces every symptom we hit:

- **TrackSelect can't produce complete tracks.** TrackSelect emits pure JSON
  (`{ type, base, config }`). A function can't cross that boundary, so tracks created via
  the UI arrive without callbacks and must be patched afterward with `updateInteraction` —
  a "create without behavior, inject it later" dance.
- **Setting a callback is an imperative per-instance mutation** when it is really just a
  function you'd rather write inline in React-land.
- **The Item type is lost.** Instance state can't carry the module's `Item`, so
  `useInteraction` funnels everything through an untyped `as TrackInteraction<Item>` cast
  (see the comment in `modules/interaction.ts`).

The underlying confusion is treating one thing as three:

- **The interaction _shape_** — what item you click, that clicking is meaningful
  (`Item = Transcript`). This is type-defining and stable → belongs to the **module**,
  exactly like the tooltip component already does.
- **The interaction _behavior_** — `router.push('/gene/' + gene.name)`. This closes over
  app state and hooks → belongs to the **app**.
- **The instance** — identity, config, display. Pure and serializable → carries **no
  functions**.

Callbacks belong to the app, not the module and not the instance.

## The fix

Move interaction handlers off the track instance and into a separate, app-created,
injected store — `interactionStore` — mirroring how `settingsStore` is injected into
`GenomeBrowser` today. `settingsStore` injects app-provided components; `interactionStore`
injects app-provided handlers. Handlers are keyed by track type, so all instances of a
type share behavior and the map can be typed through the module registry.

### Dependency injection at store creation

The app component has hooks in scope. It builds the handler map there — closing over
`router`, runtime-generated data, whatever it needs — and passes it into the factory. For
the common case, those captured values are stable for the browser session, so the store is
created once with `useMemo`. This matches `createTrackStore(options)` and
`createBrowserStore(...)`, which already take their initial inputs at creation.

```tsx
function AppBrowser() {
  const router = useRouter();                       // stable ref
  const seeds = useMemo(() => genRandomList(), []); // runtime app data, made once

  const interactionStore = useMemo(
    () =>
      createInteractionStore<typeof modules>({
        transcript: {
          onClick: (gene) => router.push(`/gene/${gene.name}`),
          onHover: (gene) => console.log(seeds[gene.index % seeds.length]),
        },
      }),
    [router, seeds], // effectively once when these values are session-stable
  );

  return (
    <GenomeBrowser
      browserStore={browserStore}
      trackStore={trackStore}
      interactionStore={interactionStore}
    />
  );
}
```

`modules` is the track module registry for this browser. Passing its type to the factory is
what gives each handler the right `Item` and concrete `track.config` type.

There is no `useEffect` and no post-create patching for the normal case. The "injection"
is just closing over intentionally stable app values when the store is built, with
`useMemo` preserving that store while those inputs remain stable.

### The rule: capture what's stable, read what's volatile

A handler needs two kinds of thing, injected differently:

- **Stable for the session** (router, a fixed random list, a query client) → **capture at
  creation** via the factory. This is the common case.
- **Continuously changing** (current region, live selection) → **read via `getState()` at
  call time**, because a snapshot captured at creation would go stale. In our architecture
  the changing state already lives in a store, so it is always reachable.

```tsx
onClick: (gene) => {
  const { region } = browserStore.getState();               // volatile → read fresh
  router.push(`/gene/${gene.name}?loc=${region.start}`);    // stable → captured once
}
```

Both live inside stable handler bodies. They do not need re-injection as long as captured
values are intentionally session-stable and volatile values are read at call time.

## Mental model

- **Module owns the shape.** It declares the interaction contract: the `Item` type and
  where in its renderer `onClick`/`onHover`/`onLeave` fire. The tooltip stays on the module
  for the same reason — it is presentation of the item, which is stable per track type.
- **App owns the behavior.** It supplies the implementation via `interactionStore`, created
  where hooks are in scope.
- **Instance owns neither.** It stays pure JSON so it round-trips through TrackSelect.

This is dependency injection: the module defines the port, the app provides the adapter.

## Handler context: track and event

Handlers receive the interaction item plus a context object carrying the full track
instance and a browser-normalized interaction event:

```ts
type TrackInteractionEvent = {
  clientX: number;
  clientY: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  sourceEvent?: unknown;
};

type TrackInteractionContext<Track> = {
  track: Readonly<Track>; // full instance { type, base, config }
  event: TrackInteractionEvent; // call-time pointer/modifier context
};

type TrackInteractionCallback<Item, Track> = (
  item: Item,
  ctx: TrackInteractionContext<Track>,
) => void;

type TrackInteraction<Item, Track> = {
  onClick?: TrackInteractionCallback<Item, Track>;
  onHover?: TrackInteractionCallback<Item, Track>;
  onLeave?: TrackInteractionCallback<Item, Track>;
};
```

Because handlers are keyed by module type, `track` is typed to that module's concrete
instance — `track.config` is the module's config, not `unknown`. This is the config
precision that gets erased inside the heterogeneous store but is fully recoverable here,
because the key identifies the module.

```ts
createInteractionStore<typeof modules>({
  transcript: {
    onClick: (gene, { track, event }) => {
      if (event.metaKey) window.open(`/gene/${gene.name}`);
      else router.push(`/gene/${gene.name}?from=${track.base.id}`);
    },
  },
});
```

`track` is read-only. To change a track, call the store (`updateConfig`, `updateBase`);
never mutate the passed instance.

### Two context sources: bind-time track, call-time event

`track` and `event` arrive from different places, so they compose in two layers:

- **`track` is bind-time** — known when `TrackContent` mounts the track. It is bound there,
  where the full instance already lives, so renderers never construct it.
- **`event` is call-time** — only the renderer's DOM handler has it, so the renderer adapts
  and passes it at the moment of interaction.

`TrackContent` binds `track` and exposes a renderer-facing interaction whose methods take
`(item, event: TrackInteractionEvent)`:

```tsx
const handlers = useInteractionStore((s) => s.handlers[track.type]);
const bound = useMemo(
  () =>
    handlers && {
      onClick: handlers.onClick && ((item, event) => handlers.onClick!(item, { track, event })),
      onHover: handlers.onHover && ((item, event) => handlers.onHover!(item, { track, event })),
      onLeave: handlers.onLeave && ((item, event) => handlers.onLeave!(item, { track, event })),
    },
  [handlers, track],
);
return <TrackInteractionProvider interaction={bound}>{/* renderer */}</TrackInteractionProvider>;
```

Renderers call `(item, event)`, converting the React DOM event into the browser's smaller
interaction event shape:

```tsx
onClick={(event) => interaction?.onClick?.(transcript.transcript, toTrackInteractionEvent(event))}
onMouseEnter={(event) => {
  interaction?.onHover?.(transcript.transcript, toTrackInteractionEvent(event));
  tooltip.show(transcript.transcript, event);
}}
onMouseLeave={(event) => {
  interaction?.onLeave?.(transcript.transcript, toTrackInteractionEvent(event));
  tooltip.hide();
}}
```

`useInteraction<Item>()` therefore returns the bound `(item, event) => void` form, not the
app-facing `(item, ctx)` form — the `track` half of the context is already applied.

This reduces stale-closure risk without pretending to eliminate it. The stored handler
should capture only session-stable values; `track` is a bound parameter refreshed on every
`TrackContent` render, and `event` is passed at call time.

## Sketch of the API

```ts
// Public, typed facade. The registry key re-narrows both the clicked item and the
// concrete track instance for that module.
type InteractionHandlersFor<Registry extends TrackModuleRegistry> = {
  [Type in keyof Registry]?: TrackInteraction<
    InteractionItemFor<Registry[Type]>,
    TrackInstanceFor<Registry[Type], Type>
  >;
};

type InteractionStore<Registry extends TrackModuleRegistry> = {
  handlers: InteractionHandlersFor<Registry>;

  // Internally this can still be stored type-erased; callers should only see the
  // registry-typed methods.
  setHandlers: (handlers: InteractionHandlersFor<Registry>) => void;
  setHandler: <Type extends keyof Registry>(
    type: Type,
    handler: NonNullable<InteractionHandlersFor<Registry>[Type]>,
  ) => void;
};

function createInteractionStore<Registry extends TrackModuleRegistry>(
  initial: InteractionHandlersFor<Registry>,
): InteractionStoreInstance<Registry>;
```

Any `unknown` cast should be contained inside the store/provider implementation. The app
API should never ask callers to write `TrackInteraction<unknown, AnyTrackInstance>`.

- `TrackContent` reads `useInteractionStore((s) => s.handlers[track.type])` instead of
  `track.interaction`, binds `track` into each handler, and feeds the result to the same
  `TrackInteractionProvider`. Renderers change only to pass the normalized interaction
  `event` at call time.
- The transcript renderer's cursor check (`interaction?.onClick ? "pointer"`) becomes a
  selector read; a store handles that reactively, so toggling a handler via `setHandler`
  updates the cursor without touching the instance.
- `setHandlers`/`setHandler` exist for the rare runtime swap or cursor-toggle case. They
  earn the store its keep over a plain context but are seldom called.

## Migration

- **Remove** `interaction` from `TrackInstance` and `updateInteraction` from `trackStore`.
  Instances become fully serializable again; TrackSelect emits complete, ready-to-use
  tracks and the "attach callbacks later" gap disappears. This also removes one of the
  deliberate cast sites noted in project memory.
- **Add** `createInteractionStore`, an optional `interactionStore` prop on
  `GenomeBrowser` (mirroring `settingsStore`), and an `InteractionStoreProvider` that
  `TrackContent` reads from.
- **Type** the handler map through the module registry so `onClick`'s item is the module's
  `Item` and `ctx.track` is the module's concrete instance, eliminating the untyped funnel
  cast in `modules/interaction.ts`.
- **Update renderers** to pass a normalized interaction `event` at call time
  (`interaction?.onClick?.(item, toTrackInteractionEvent(event))`), and change
  `useInteraction`'s return type from `TrackInteraction<Item>` to the bound
  `(item, event) => void` form.
- **Drop** the second `interaction` argument from `module.create`; it is no longer needed
  since instances carry no callbacks.
- **Revise** ADRs 0007 and 0008: interaction handlers are app-owned and injected at
  interaction-store creation, resolved by track type at the browser boundary; instances
  carry no functions. (This also clears the ADR-0008 staleness already flagged in memory.)
- **Update** docs (`packages/v2/docs/tracks.md`, `customTrackModules.md`) to show the
  `interactionStore` pattern instead of the `create` second argument.
