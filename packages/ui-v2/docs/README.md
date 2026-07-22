# @weng-lab/genomebrowser-ui-v2

`@weng-lab/genomebrowser-ui-v2` provides higher-level React UI for `@weng-lab/genomebrowser-v2`. Use it when an application needs browser controls such as `TrackSelect` in addition to the v2 rendering runtime and stores.

## Install

Install UI v2, v2, and the UI package's peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-ui-v2 @weng-lab/genomebrowser-v2 react react-dom @emotion/react @emotion/styled @mui/material @mui/icons-material @mui/x-data-grid-premium @mui/x-license @mui/x-tree-view
```

The supported peer major versions are React 19, Emotion 11, MUI 7, and MUI X 8. Use your package manager's peer-dependency output to keep the installed versions compatible with the release you select.

UI v2 participates in the host application's normal MUI setup and theme. It does not require a package-specific stylesheet or provider.

UI v2 uses MUI X Premium components but does not provide or configure an MUI X license. The host application must have its own MUI X Premium license and call `LicenseInfo.setLicenseKey` before rendering UI v2:

```ts
import { LicenseInfo } from "@mui/x-license";

LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_X_LICENSE_KEY);
```

Keep this setup in the host application's entry point or another module imported before `TrackSelect`. The environment variable name is host-defined; UI v2 does not read it or include a license key in the distributed package.

## Start here

- [Getting started](gettingStarted.md) shows a browser and TrackSelect sharing one stable track store.
- [Cytobands](cytobands.md) documents chromosome ideograms, browser-region brackets, and interactive loci.
- [TrackSelect](trackSelect.md) explains catalogs, the selection lifecycle, customization, schema tooling, and troubleshooting.
- [Track interactions](recipes/trackInteractions.md) shows one shared runtime-aware callback dispatcher across a heterogeneous catalog.
