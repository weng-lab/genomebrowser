# BrowserNavigationButton

`BrowserNavigationButton` is a store-bound MUI button for one pan or zoom action. Use it to build navigation controls that match your application while keeping them synchronized with `GenomeBrowser`.

## Usage

Create the stores outside React rendering, then pass the same browser store to every navigation button and `GenomeBrowser`:

```tsx
import Stack from "@mui/material/Stack";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
  trackWidth: 900,
});

const useTrackStore = createTrackStore({ modules: [] });

export function BrowserWithNavigation() {
  return (
    <>
      <Stack direction="row" spacing={1}>
        <BrowserNavigationButton
          action={{ type: "pan", fraction: -0.5 }}
          browserStore={useBrowserStore}
          variant="outlined"
        >
          ← Half viewport
        </BrowserNavigationButton>
        <BrowserNavigationButton
          action={{ type: "pan", fraction: 0.5 }}
          browserStore={useBrowserStore}
          variant="outlined"
        >
          Half viewport →
        </BrowserNavigationButton>
        <BrowserNavigationButton
          action={{ type: "zoom", factor: 2 }}
          browserStore={useBrowserStore}
          variant="outlined"
        >
          Zoom out 2×
        </BrowserNavigationButton>
        <BrowserNavigationButton
          action={{ type: "zoom", factor: 0.5 }}
          browserStore={useBrowserStore}
          variant="outlined"
        >
          Zoom in 2×
        </BrowserNavigationButton>
      </Stack>

      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </>
  );
}
```

The UI package does not provide a standard toolbar. Your application chooses the actions, children, icons, tooltips, grouping, ordering, wrapping, MUI variants, sizes, and styling.

## Navigation behavior

A pan `fraction` is signed and relative to the current viewport span. Negative values pan left and positive values pan right. For example, `-0.5` moves left by half a viewport. The button rounds the shift to the nearest whole base, with a minimum one-base movement, preserves the viewport span, clamps at chromosome boundaries, and applies the result through the browser store's `setRegion` action.

A zoom `factor` uses the core browser store convention: values between zero and one zoom in, while values greater than one zoom out. For example, `0.5` zooms in 2× and `2` zooms out 2×. Zooming delegates to the store's center-based `zoom(factor)` action.

Activation always reads the latest state from the supplied store. If you render multiple browsers, bind each button to the same store instance as the `GenomeBrowser` it should control.

## Disabled behavior

The button uses coarse boundary checks. It is disabled when:

- its action or current browser region is invalid;
- a pan points past the current chromosome edge;
- a zoom-in action is at a one-base span;
- a zoom-out action already spans the chromosome; or
- you pass `disabled`.

These checks do not preview the exact rounded result. A valid zoom factor close to one can remain enabled even when activation produces no region change. Pass `disabled` when application state, such as a loading or locked interaction, should temporarily prevent navigation.

## API

### `BrowserNavigationButtonProps`

| Prop           | Type                      | Default  | Description                                                                            |
| -------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance`    | Required | The same browser store instance used by the `GenomeBrowser` that this button controls. |
| `action`       | `BrowserNavigationAction` | Required | The single pan or zoom action performed on activation.                                 |

The component also accepts ordinary MUI `ButtonProps`, including `children`, icons, `variant`, `size`, `sx`, and accessibility attributes. Its navigation `action` replaces MUI Button's similarly named action-ref prop, and it does not accept `onClick`; navigation activation is owned by the component. The standard MUI `disabled` prop defaults to `false` and combines with navigation availability.

```ts
type BrowserNavigationAction = { type: "pan"; fraction: number } | { type: "zoom"; factor: number };
```

Pan fractions must be finite and nonzero. Zoom factors must be finite, positive, and not equal to one. Invalid actions are disabled rather than throwing during rendering.

## Accessibility

The component renders a MUI `Button` and preserves its native button keyboard and focus behavior. It generates a concise accessible name from the action direction: `Pan left`, `Pan right`, `Zoom in`, or `Zoom out`.

Set `aria-label` when the name should include application-specific detail such as magnitude. You can instead use `aria-labelledby` to reference visible text; either explicit naming method takes precedence over the generated name. Icon-only children still receive the generated name. Tooltips are optional and remain the application's responsibility.
