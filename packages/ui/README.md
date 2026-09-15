# @weng-lab/genomebrowser-ui

React application controls for `@weng-lab/genomebrowser`: pan and zoom buttons, region selection controls, a highlight dialog, collection-based track selection, and chromosome ideograms.

The application owns the browser and track stores. Pass those stores to the controls that use them. `Cytobands` accepts data and callbacks directly, so it can also render independently of a browser.

## Install

In a React application, install UI and its peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-ui@latest @weng-lab/genomebrowser@latest @emotion/react@latest @emotion/styled@latest @mui/material@latest @mui/icons-material@latest @mui/x-data-grid-premium@latest @mui/x-license@latest @mui/x-tree-view@latest
```

Supported versions are React and React DOM 19.2+, Emotion 11, MUI 7, and MUI X 8. Check your package manager's peer-dependency output when installing. Add `@weng-lab/genomebrowser-tracks@latest` for first-party track modules and `@weng-lab/genomic-reader@latest` when importing its cytoband reader.

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

## Documentation

Start with [Add browser controls](docs/gettingStarted/addBrowserControls.md) for a complete browser with navigation, selection, and highlights.

- [Track selection](docs/guides/trackSelection.md): browse collections, set defaults, and save selections.
- [Track interactions](docs/guides/trackInteractions.md): attach application callbacks to collection tracks.
- [Chromosome overview](docs/guides/chromosomeOverview.md): connect cytobands and highlights to a browser.
- [Troubleshooting](docs/troubleshooting.md): diagnose setup and integration problems.
- [API reference](docs/reference/README.md): component props, helpers, and types.

The [documentation index](docs/README.md) maps the learning path and package responsibilities.
