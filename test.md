One more clarification. If we drop the enum and each track config references its definition directly, the track instance itself would look something like:

```ts
interface Track {
  id: string
  title: string
  height: number
  displayMode: string  // key into definition.renderers
  color?: string
  definition: TrackDefinition  // holds renderers, fetcher, settingsPanel, defaultDisplayMode, etc.
  [key: string]: any  // track-specific data (url, assembly, etc.)
}
```

So a BigWig track instance would be:
```ts
{
  id: "1",
  title: "H3K27ac",
  height: 100,
  displayMode: "full",
  definition: BigWigDefinition,  // imported from tracks/bigwig/
  url: "https://...",
  color: "#ff0000"
}
```

And `BigWigDefinition` would be a single exported object:
```ts
export const BigWigDefinition: TrackDefinition = {
  renderers: { full: ReworkBigWig, dense: DenseBigWig },
  fetcher: fetchBigWig,
  settingsPanel: BigWigSettings,
  defaultDisplayMode: "full",
  defaultHeight: 100,
}
```

Does this shape match what you have in mind? And should per-type fields (like `url` for BigWig, `assembly` for Transcript) be typed via generics/intersection, or just use `[key: string]: any` and let each definition's fetcher/renderer know what to expect?
