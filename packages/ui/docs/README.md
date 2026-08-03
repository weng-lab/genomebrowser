# @weng-lab/genomebrowser-ui

`@weng-lab/genomebrowser-ui` provides higher-level React UI for `@weng-lab/genomebrowser`. Use it when an application needs browser controls such as `TrackSelect` in addition to the rendering runtime and stores.

## Install

Install the coordinated UI and runtime prereleases with the UI package's peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-ui@alpha @weng-lab/genomebrowser@alpha react@^19.2 react-dom@^19.2 @emotion/react @emotion/styled @mui/material @mui/icons-material @mui/x-data-grid-premium @mui/x-license @mui/x-tree-view
```

The supported peer versions are React 19.2+, Emotion 11, MUI 7, and MUI X 8. Use your package manager's peer-dependency output to keep the installed versions compatible with the release you select.

The UI package participates in the host application's normal MUI setup and theme. It does not require a package-specific stylesheet or provider.

The UI package uses MUI X Premium components but does not provide or configure an MUI X license. The host application must have its own MUI X Premium license and call `LicenseInfo.setLicenseKey` before rendering its components:

```ts
import { LicenseInfo } from "@mui/x-license";

LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_X_LICENSE_KEY);
```

Keep this setup in the host application's entry point or another module imported before `TrackSelect`. The environment variable name is host-defined; the UI package does not read it or include a license key in the distributed package.

## Start here

- [Getting started](gettingStarted.md) shows a browser and TrackSelect sharing one stable track store.
- [Cytobands](cytobands.md) documents chromosome ideograms, browser-region brackets, and interactive loci.
- [TrackSelect](trackSelect.md) explains catalogs, the selection lifecycle, customization, schema tooling, and troubleshooting.
- [Track interactions](recipes/trackInteractions.md) shows one shared runtime-aware callback dispatcher across a heterogeneous catalog.
