# Module-Author Helpers

Most applications need only `GenomeBrowser`, `createBrowserStore`, `createTrackStore`, and registered modules. This page covers the narrower helpers intended for authors of track renderers, settings panels, and browser UI overrides. Import them from the package root, never from internal source paths.

## Data-dependent requests with `fetchOnChange`

`fetchOnChange` marks config schema fields whose value contributes to a track's request signature. Region changes always request data; config-only changes request data only when a marked value changes.

```ts
const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  smoothing: z.number().default(0),
});
```

Mark data sources and query inputs. Leave colors, display options, labels, height, and other renderer-only choices unmarked. Nested object and array fields can be marked individually.

## Renderer interactions

`useInteraction<Item>()` exposes item-only handlers bound to the active track instance's application callbacks. `useTooltip<Item, Config>()` reads the active runtime context and positions that type's registered tooltip component in the browser. Renderers do not construct or pass runtime type, base, or config.

```tsx
function ExampleRenderer({ config, data }: TrackRendererProps<Config, Data>) {
  const interaction = useInteraction<ExampleItem>();
  const tooltip = useTooltip<ExampleItem, Config>();

  return data.map((item) => (
    <rect
      key={item.id}
      onClick={() => interaction?.onClick?.(item)}
      onMouseEnter={(event) => {
        interaction?.onHover?.(item);
        tooltip.show(item, event);
      }}
      onMouseLeave={() => {
        interaction?.onLeave?.(item);
        tooltip.hide();
      }}
    />
  ));
}
```

If the module has no `tooltipComponent`, `show` is a no-op. A tooltip component receives `{ item, context }`; application interactions receive `(item, context)`. Both see the current shallow read-only `{ type, base, config }` view, including later validated mutations. Tooltip state belongs to the active browser and is suppressed during panning. These hooks require the providers rendered by `GenomeBrowser`.

Runtime context contains no TrackSelect catalog metadata. Core owns runtime state; UI v2 owns catalog metadata and may adapt callbacks where those values need to be combined.

## Automatic track height

`useAutoTrackHeight(id, rowCount, options)` is for renderers whose required height follows a row count. It returns the row height and updates the stored track height after render when needed.

```tsx
const rowHeight = useAutoTrackHeight(id, rows.length, {
  rowHeight: 12,
  minHeight: 30,
});
```

`rowHeight` defaults to `12` and `minHeight` to `30`. Use this only inside `GenomeBrowser`; it reads the active track store.

## Module settings

A module settings component should normally use its props:

```tsx
function ExampleSettings({ config, updateConfig }: TrackSettingsProps<Config>) {
  const setLogScale = () => {
    const result = updateConfig({ scale: "log" });
    if (!result.ok) reportError(result.error);
  };

  return (
    <SettingsSection title="Scale">
      <button onClick={setLogScale} disabled={config.scale === "log"}>
        Use log scale
      </button>
    </SettingsSection>
  );
}
```

`SettingsSection` supplies consistent section layout. The browser owns the modal shell and base controls. Apps can replace those browser-owned pieces with `createSettingsStore`; `useDraggableSettingsModal` is only for implementing a custom modal shell.

## Store hooks

The package exports `useBrowserStore`, `useTrackStore`, `useSettingsStore`, and `useContextMenuStore` to read the stores provided by the nearest `GenomeBrowser`. They are contextual integration APIs, not the ordinary way to mutate a track from its own settings panel.

For example, a module settings panel might need to know whether another track is present while still using its focused prop for its own update:

```tsx
function ExampleSettings({ updateConfig }: TrackSettingsProps<Config>) {
  const hasReference = useTrackStore((state) => state.getTrack("reference") !== undefined);

  return (
    <button disabled={!hasReference} onClick={() => updateConfig({ compareWithReference: true })}>
      Compare with reference
    </button>
  );
}
```

Prefer renderer and settings props first. Use a contextual store hook only when a component genuinely needs browser-wide state that its focused API does not provide. Applications outside the browser tree already hold the stable store hook returned by the corresponding factory and can read it directly.

## Application store factories

Applications create `createBrowserStore` and `createTrackStore` because those stores require startup domain input. `GenomeBrowser` creates context-menu and settings stores internally unless an app supplies a settings override. Name returned Zustand hooks with a `use` prefix and keep them stable.

See [Tracks and track modules](tracks.md) for the authoring contract. The first-party track exports are documented as tracks, not as a general library of low-level renderer primitives.
