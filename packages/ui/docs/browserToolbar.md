# BrowserToolbar

`BrowserToolbar` combines region search and copying, pan and zoom controls, interaction selection, and optional management actions. Pass the same browser store used by `GenomeBrowser`.

## Usage

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";
import { BrowserToolbar } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
  trackWidth: 900,
});

export function Navigation({ searchUrl }: { searchUrl: string }) {
  return (
    <BrowserToolbar
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

Supply a GraphQL endpoint compatible with Weng Lab `GenomeSearch`. The package does not create an API route. Search assembly must match the browser store's assembly (`GRCh38` for hg38, or `mm10`).

## Examples

Add `onManageHighlights={() => setHighlightsOpen(true)}` and `onSelectTracks={() => setTracksOpen(true)}` to connect your application's dialogs. Each action appears only when its callback is supplied; the Manage group is absent when neither is supplied. Dialog state and rendering remain with the host application.

## API

`BrowserToolbarProps` is exported from the package root.

| Prop                 | Type                                          | Default  | Description                                                                             |
| -------------------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `browserStore`       | `BrowserStoreInstance`                        | Required | Store read and updated by search, navigation, and interaction controls.                 |
| `search`             | Object below                                  | Required | Weng Lab GenomeSearch configuration.                                                    |
| `search.assembly`    | `"GRCh38" \| "mm10"`                          | Required | Assembly used to resolve search results.                                                |
| `search.graphqlUrl`  | `string`                                      | Required | Host-provided search endpoint.                                                          |
| `search.queries`     | `ResultType[]` from `@weng-lab/ui-components` | Required | Enabled GenomeSearch query categories, such as `Gene`, `SNP`, `cCRE`, and `Coordinate`. |
| `onManageHighlights` | `() => void`                                  | Omitted  | Runs when Highlights is clicked.                                                        |
| `onSelectTracks`     | `() => void`                                  | Omitted  | Runs when Tracks is clicked.                                                            |

Pan magnitude starts at ¼ viewport, with ½ and 1 viewport options. Zoom magnitude starts at 3×, with 1.5× and 10× options. Magnitudes and search editing state belong to each toolbar instance. Navigation uses the bounds and behavior of [BrowserNavigationButton](browserNavigationButton.md); interaction selection uses [BrowserSelectionControls](browserSelectionControls.md).

## Accessibility

The controls form a named group with fieldset legends. Icon actions have accessible names. Clicking the region opens an autofocus search input; Escape or Cancel closes it and restores focus to the region button. A successful search also restores focus; clicking outside closes search without moving focus back. Groups wrap on narrow screens.

## Notes

Install `@weng-lab/ui-components@^3.1.4` as a peer dependency alongside the package's other peers. The toolbar uses your MUI theme. Copying uses the browser clipboard API and reports success or failure in a snackbar.
