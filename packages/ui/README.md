# @weng-lab/genomebrowser-ui

React application controls for `@weng-lab/genomebrowser`: a region search and navigation toolbar, pan and zoom buttons, region selection controls, a highlight dialog, collection-based track selection, and chromosome ideograms.

The application owns the browser and track stores. Pass those stores to the controls that use them. `Cytobands` accepts data and callbacks directly, so it can also render independently of a browser.

## Install

In a React application, install UI and its peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-ui@2.0.0 @weng-lab/genomebrowser@2.0.0 @emotion/react@11 @emotion/styled@11 @mui/material@7 @mui/icons-material@7 @mui/x-data-grid-premium@8 @mui/x-license@8 @mui/x-tree-view@8 @weng-lab/ui-components@^3.1.4
```

Supported versions are React and React DOM 19.2+, Emotion 11, MUI 7, MUI X 8, and Weng Lab UI components 3.1.4 within major version 3. Check your package manager's peer-dependency output when installing. Add `@weng-lab/genomebrowser-tracks@2.0.0` for first-party track modules and `@weng-lab/genomic-reader@2.0.0` when importing its cytoband reader.

UI components use the application's MUI theme. There is no package-specific provider, stylesheet, or global CSS reset to install.

### Configure the MUI X license

`TrackSelect` uses MUI X Premium components. Configure your application's MUI X Premium license before rendering the picker. For example, in a Vite application entry point:

```ts
import { LicenseInfo } from "@mui/x-license";

LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_X_LICENSE_KEY);
```

Use your own license key and environment variable name; the package supplies neither.

## Add a control to an existing browser

Pass the browser's store to a navigation button. This component pans right by half the visible region:

```tsx
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";

export function PanRight({ browserStore }: { browserStore: BrowserStoreInstance }) {
  return (
    <BrowserNavigationButton browserStore={browserStore} action={{ type: "pan", fraction: 0.5 }}>
      Pan right
    </BrowserNavigationButton>
  );
}
```

Render `PanRight` beside `GenomeBrowser` with the same `browserStore`. The button disables itself at the chromosome boundary.

## Optional genome search

Applications that add SCREEN-backed search need a server-side `SCREEN_API_KEY` for gene, SNP, and cCRE queries. `BrowserToolbar` embeds `GenomeSearch` from `@weng-lab/ui-components` for these searches. Coordinate-only search, pan and zoom, selection controls, and management actions do not require this key.

Point `BrowserToolbar`'s `search.graphqlUrl`, or `GenomeSearch`'s `graphqlUrl`, at an application server endpoint, such as `/api/screen-graphql`. That endpoint should forward GraphQL requests to `https://screen.api.wenglab.org/graphql` and add `Authorization: Bearer <SCREEN_API_KEY>` from the server environment. Keep the key out of component props and browser-exposed environment variables such as `NEXT_PUBLIC_*` or `VITE_*`. The starter application includes this proxy for local development; its bundled deployment guide describes the production endpoint.

## Documentation

Before writing or changing an integration, read `node_modules/@weng-lab/genomebrowser-ui/docs/README.md` in your application, then follow its links to the relevant guides and API references. These bundled docs describe the installed package version. Give coding agents this path so they use the same version-specific documentation.

Start with [Add browser controls](docs/01-gettingStarted/01-addBrowserControls.md) for a complete browser with navigation, selection, and highlights.

- [BrowserToolbar](docs/03-reference/01-browserControls/BrowserToolbar.md): combine region search, navigation, interaction modes, and management actions.
- [Track selection](docs/02-guides/trackSelection.md): browse collections, set defaults, and save selections.
- [Track interactions](docs/02-guides/trackInteractions.md): attach application callbacks to collection tracks.
- [Chromosome overview](docs/02-guides/chromosomeOverview.md): connect cytobands and highlights to a browser.
- [Troubleshooting](docs/04-troubleshooting.md): diagnose setup and integration problems.
- [API reference](docs/03-reference/README.md): component props, helpers, and types.

The [documentation index](docs/README.md) maps the learning path and package responsibilities.
