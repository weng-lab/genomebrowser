# useBasePairDetail

Use the hosting browser's shared decision to draw nucleotide detail. Core combines the visible-region cutoff with a buffered width guard, so tracks in one browser switch at the same thresholds.

## Usage

```tsx
import { useBasePairDetail, type TrackRendererProps } from "@weng-lab/genomebrowser";

type Data = { sequence: string };

export function SequenceRenderer({ data }: TrackRendererProps<{}, Data>) {
  const showBasePairs = useBasePairDetail();
  return <text>{showBasePairs && data.sequence ? data.sequence : "Sequence hidden"}</text>;
}
```

Call the hook unconditionally from a hosted renderer or its descendants. Each track still checks its data and display-mode requirements. A true result does not promise that sequence has loaded.

## useBasePairDetail

`useBasePairDetail(): boolean` takes no arguments. It subscribes to one decision owned by the mounted browser and throws outside a `GenomeBrowser`. All consumers in that browser share its history; mounting a new consumer does not reset it. Unmounting the browser releases it.

The host configures `basePairDetail.maxVisibleBases` through [createBrowserStore or setBasePairDetail](../01-browserSetup/browserStore.md#base-pair-detail). The default is 100 visible bases, inclusive. Overscan and individual tracks' retained render regions do not affect this test.

Within the cutoff, detail starts hidden until each base has at least 8 logical SVG units of plot width. Once visible, it stays visible down to 6 units per base, inclusive. Below 6 it hides and needs 8 to reappear. Leaving the bp cutoff hides detail and resets that history. Between 6 and 8, the result therefore depends on the preceding viewport and width. This buffer prevents small resizes near one boundary from repeatedly toggling letters.

The plot excludes the margin. Responsive resizing updates the decision immediately. Increasing `scale` in responsive sizing reduces logical plot width and can hide letters. In fixed sizing, scale magnifies cells and text together without changing the decision. Browser instances sharing stores share the bp cutoff but retain their own measured width and visibility history.

## Fetching detail

Fetchers use `demand.basePairDetail`, which reports only whether the visible span is within the bp cutoff. It deliberately ignores the width guard, allowing narrow views to prepare data before they have room to show it. Read the requested `demand.region`, including overscan, as usual.

```ts
import type { TrackFetch } from "@weng-lab/genomebrowser";

type Config = { sequence: string };
type Data = { sequence: string };

export const fetchSequence: TrackFetch<Config, Data> = async ({ demand, track }) => ({
  sequence: demand.basePairDetail ? track.config.sequence : "",
});
```

This local-data example illustrates the decision; a file-backed fetcher would read its sequence source. No module registration flag is required. Core refreshes track demand when eligibility changes, even when old data covers the viewport. Editing the cutoff without changing eligibility does not itself refetch. Superseded requests are aborted and ignored.

Width-only changes retain the existing result while ordinary width-dependent requests debounce. Fetchers should use track resources to reuse width-independent data. First-party ruler, BAM, and dynseq retain their last successful reference-sequence window, so resizing the same region does not read that sequence again. See [fetching data](../03-trackDefinition/fetchingData.md) for resources and result lifetime.

## useBasePairDetailStatus and BasePairDetailStatus

`useBasePairDetailStatus(): BasePairDetailStatus` explains the same browser-owned decision for hosted settings and controls. It takes no arguments, requires a `GenomeBrowser`, and throws outside one. The returned snapshot is readonly and stable until either field changes.

| Field             | Type                                   | Meaning                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reason`          | `"ready"` or `"viewport"` or `"width"` | `ready` means the shared gate allows letters; `viewport` means the visible span exceeds the cutoff; `width` means the span qualifies but the buffered width guard hides letters. Track-specific display requirements and data availability are separate. |
| `zoomTargetBases` | `number` or `null`                     | The largest whole-base span satisfying both the cutoff and the width entry guard. Uses the actual mounted plot width, including responsive sizing and scale. Null means the plot cannot fit even one base.                                               |

A settings control can offer a centered zoom using the hosting browser's `zoom` action:

```tsx
import { useBasePairDetailStatus, useGenomeBrowser } from "@weng-lab/genomebrowser";

export function ZoomToLetters() {
  const { reason, zoomTargetBases } = useBasePairDetailStatus();
  const { useBrowserStore } = useGenomeBrowser();
  const span = useBrowserStore((state) => state.region.end - state.region.start);
  const zoom = useBrowserStore((state) => state.zoom);
  if (reason === "ready" || zoomTargetBases === null || zoomTargetBases >= span) return null;
  return <button onClick={() => zoom(zoomTargetBases / span)}>Zoom to letters</button>;
}
```

Changing a cutoff or plot width updates this status even when `useBasePairDetail()` remains false. Panning at the same span and width leaves it unchanged. Both hooks share the mounted browser's visibility history.

`maxReadableBases` reports the maximum span allowed by the mounted width entry guard, independent of the configured bp cutoff. Settings can use it to bound a slider to readable choices.
