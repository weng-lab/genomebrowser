# ControlToolbar

`ControlToolbar` combines region search and copying, pan and zoom controls, interaction selection, and optional management actions. Pass the same browser store used by `GenomeBrowser`.

## Usage

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";
import { ControlToolbar } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
  trackWidth: 900,
});

export function Navigation({ searchUrl }: { searchUrl: string }) {
  return (
    <ControlToolbar
      browserStore={useBrowserStore}
      search={{
        assembly: "GRCh38",
        graphqlUrl: searchUrl,
        queries: ["Gene", "SNP", "cCRE", "Coordinate"],
      }}
    />
  );
}
```

Supply a GraphQL endpoint compatible with Weng Lab `GenomeSearch`. The package does not create an API route. For SCREEN-backed gene, SNP, and cCRE queries, configure a server-side API key and proxy as described in [search setup](../../../README.md#optional-genome-search). Search assembly must match the browser store's assembly (`GRCh38` for hg38, or `mm10`).

## Examples

Add `onManageHighlights={() => setHighlightsOpen(true)}` and `onSelectTracks={() => setTracksOpen(true)}` to connect your application's dialogs. Each action appears only when its callback is supplied; the Manage group is absent when neither callbacks nor custom actions are supplied. Dialog state and rendering remain with the host application.

### Add application actions

Pass `navigationActions` or `managementActions` as React nodes to append controls inside the corresponding group. These props also work on `NavigationControls` and `ManagementControls`. The host owns their behavior and accessible labels. Use small MUI buttons, with a 32px height for navigation actions.

```tsx
<ControlToolbar
  browserStore={useBrowserStore}
  search={search}
  navigationActions={
    <Button size="small" variant="outlined" sx={{ height: 32 }} onClick={recenter}>
      Recenter
    </Button>
  }
  managementActions={
    <Button size="small" onClick={selectBlock}>
      Select LD Block
    </Button>
  }
/>
```

### Compose individual sections

Import any subset of the sections to build a custom layout. Each renders its own labeled fieldset with the same styling as the toolbar. They receive stores and callbacks directly and need no toolbar provider. The host controls their order and surrounding layout.

```tsx
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { InteractionControls, NavigationControls } from "@weng-lab/genomebrowser-ui";

export function CompactControls({ browserStore }: { browserStore: BrowserStoreInstance }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <InteractionControls browserStore={browserStore} />
      <NavigationControls browserStore={browserStore} />
    </div>
  );
}
```

For an unframed interaction selector or custom navigation buttons, use [SelectionControls](SelectionControls.md) or [NavigationButton](NavigationButton.md).

Use [LabeledGroup](../05-sharedUI/LabeledGroup.md) to give custom controls the same outline and label.

## API

### ControlToolbarProps

`ControlToolbarProps` is exported from the package root.

| Prop                 | Type                                          | Default  | Description                                                                                                     |
| -------------------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `browserStore`       | `BrowserStoreInstance`                        | Required | Store read and updated by search, navigation, and interaction controls.                                         |
| `search`             | Object below                                  | Required | Weng Lab GenomeSearch configuration.                                                                            |
| `search.assembly`    | `"GRCh38" \| "mm10"`                          | Required | Assembly used to resolve search results.                                                                        |
| `search.graphqlUrl`  | `string`                                      | Required | Host-provided search endpoint.                                                                                  |
| `search.queries`     | `ResultType[]` from `@weng-lab/ui-components` | Required | Enabled GenomeSearch query categories, such as `Gene`, `SNP`, `cCRE`, and `Coordinate`.                         |
| `onManageHighlights` | `() => void`                                  | Omitted  | Runs when Highlights is clicked.                                                                                |
| `onSelectTracks`     | `() => void`                                  | Omitted  | Runs when Tracks is clicked.                                                                                    |
| `navigationActions`  | `ReactNode`                                   | Omitted  | Appends application controls after the pan and zoom controls.                                                   |
| `managementActions`  | `ReactNode`                                   | Omitted  | Appends application controls after the built-in management actions and can display the Manage group on its own. |

Pan magnitude starts at ¼ viewport, with ½ and 1 viewport options. The selector and dropdown options display these as 25%, 50%, and 100%. Zoom magnitude starts at 3X, with 1.5X and 10X options. Magnitudes belong to each navigation controls instance; search editing state belongs to each region controls instance. Navigation uses the bounds and behavior of [NavigationButton](NavigationButton.md); interaction selection uses [SelectionControls](SelectionControls.md).

### RegionControls

Displays the current coordinates and span, opens region search, and copies coordinates. `RegionControlsProps` is exported from the package root.

| Prop           | Type                            | Default  | Description                                                            |
| -------------- | ------------------------------- | -------- | ---------------------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance`          | Required | Store whose region is displayed and updated after a successful search. |
| `search`       | `ControlToolbarProps["search"]` | Required | The assembly, GraphQL endpoint, and query categories documented above. |

Use `<RegionControls browserStore={useBrowserStore} search={search} />` with the search configuration from the usage example. Its Region fieldset grows up to 440px in a flex layout.

### NavigationControls

Renders the Navigate fieldset with pan and zoom buttons and magnitude selectors. `NavigationControlsProps` is exported from the package root. Magnitude defaults and choices are documented above.

| Prop                | Type                   | Default  | Description                                                   |
| ------------------- | ---------------------- | -------- | ------------------------------------------------------------- |
| `browserStore`      | `BrowserStoreInstance` | Required | Store updated by pan and zoom actions.                        |
| `navigationActions` | `ReactNode`            | Omitted  | Appends application controls after the pan and zoom controls. |

### InteractionControls

Renders the Interaction fieldset around `SelectionControls`, with the toolbar's compact button sizes. `InteractionControlsProps` is exported from the package root.

| Prop           | Type                   | Default  | Description                                         |
| -------------- | ---------------------- | -------- | --------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance` | Required | Store whose selection mode is read and updated.     |
| `disabled`     | `boolean`              | `false`  | Disables the mode buttons and their hover tooltips. |

### ManagementControls

Renders the Manage fieldset with application callbacks. It renders nothing when neither callback nor custom actions are supplied. It needs no browser store. `ManagementControlsProps` is exported from the package root.

| Prop                 | Type         | Default | Description                                                                                               |
| -------------------- | ------------ | ------- | --------------------------------------------------------------------------------------------------------- |
| `onManageHighlights` | `() => void` | Omitted | Shows Highlights and runs when it is clicked.                                                             |
| `onSelectTracks`     | `() => void` | Omitted | Shows Tracks and runs when it is clicked.                                                                 |
| `managementActions`  | `ReactNode`  | Omitted | Appends application controls after the built-in actions. The group can contain only these custom actions. |

Use `<ManagementControls onSelectTracks={() => setTracksOpen(true)} />` to expose only track management. The host owns dialog state and rendering.

## Accessibility

The controls form a named group with fieldset legends. Icon actions have accessible names. Navigate tooltips describe pan and zoom actions and their magnitude selectors; Interaction tooltips explain each drag mode. Manage tooltips identify the highlights and tracks actions. Magnitude tooltips hide while their dropdown is open so the options remain visible. The region display has a tooltip inviting you to search for a new region. Clicking the region opens an autofocus search input; Escape or Cancel closes it and restores focus to the region button. Rejected regions keep search open and display the store validation error without clearing the draft. Escape is intercepted only while search is open. A successful search also restores focus; clicking outside closes search without moving focus back. Pan and zoom each place their magnitude selector between two outlined action buttons. The region field grows up to 440px and contracts before groups wrap on narrow screens; long coordinates truncate in the display and remain available by opening search.

## Notes

Install `@weng-lab/ui-components@^3.1.4` as a peer dependency alongside the package's other peers. The toolbar uses your MUI theme. Copying uses the browser clipboard API and reports success or failure in a snackbar.

Return to [Browser controls](README.md).
