# BrowserNavigationControls

`BrowserNavigationControls` provides compact, accessible buttons for panning and zooming a genomic region. It is controlled: your application owns the current region and decides how to apply every navigation request.

## Usage

```tsx
import { useState } from "react";
import { hg38, type GenomicRegion } from "@weng-lab/genomebrowser";
import { BrowserNavigationControls } from "@weng-lab/genomebrowser-ui";

export function BrowserControls() {
  const [region, setRegion] = useState<GenomicRegion>({
    chromosome: "chr6",
    start: 20_000_000,
    end: 23_000_000,
  });

  return <BrowserNavigationControls assembly={hg38} region={region} onRegionChange={setRegion} />;
}
```

Use the same region and callback as your browser store when the controls operate a `GenomeBrowser`:

```tsx
const region = useBrowserStore((state) => state.region);
const setRegion = useBrowserStore((state) => state.setRegion);

<BrowserNavigationControls
  assembly={hg38}
  region={region}
  onRegionChange={(nextRegion) => {
    setRegion(nextRegion);
  }}
/>;
```

Keeping `onRegionChange` under application control lets you apply navigation-related behavior such as region history, analytics, or resetting application-specific interactions before updating the browser store.

## Behavior

The pan controls move left or right by one quarter, one half, or one complete viewport. Fractional base counts round to the nearest whole base, with a minimum one-base movement. Panning preserves the viewport span and stops at chromosome boundaries.

The zoom controls zoom in or out around the current viewport center by 1.5×, 3×, or 10×. Fractional spans round to the nearest whole base. Zooming never produces a viewport smaller than one base or larger than the current chromosome. Near a chromosome boundary, the component shifts the resulting viewport to preserve its requested span.

## API

### `BrowserNavigationControlsProps`

| Prop             | Type                              | Default  | Description                                                                                         |
| ---------------- | --------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `assembly`       | `AssemblyDefinition`              | Required | Supplies the case-sensitive chromosome lengths used to constrain pan and zoom requests.             |
| `region`         | `GenomicRegion`                   | Required | The current zero-based, half-open browser region.                                                   |
| `onRegionChange` | `(region: GenomicRegion) => void` | Required | Runs with the next constrained region when an enabled navigation button changes the current region. |
| `disabled`       | `boolean`                         | `false`  | Disables every pan and zoom action.                                                                 |

An unknown chromosome or otherwise invalid region disables every navigation action. The component does not repair invalid controlled input or call `onRegionChange` for a no-op.

## Accessibility

Pan and zoom are separate labeled groups. Every button has an accessible action name and a matching tooltip, and uses native button keyboard behavior. Actions that cannot change the region at a chromosome or zoom boundary are disabled.

## Notes

- The component does not subscribe to or mutate a browser store directly.
- The button steps are fixed so applications present consistent navigation behavior.
- Update the controlled `region` after `onRegionChange` to keep subsequent actions synchronized.
