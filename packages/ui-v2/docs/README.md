# @weng-lab/genomebrowser-ui-v2

`@weng-lab/genomebrowser-ui-v2` provides higher-level React UI for `@weng-lab/genomebrowser-v2`. Use it when an application needs browser controls such as `TrackSelect` in addition to the v2 rendering runtime and stores.

## Install

Install UI v2, v2, and the UI package's peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-ui-v2 @weng-lab/genomebrowser-v2 react react-dom @emotion/react @emotion/styled @mui/material @mui/icons-material @mui/x-data-grid-premium @mui/x-license @mui/x-tree-view
```

The supported peer major versions are React 19, Emotion 11, MUI 7, and MUI X 8. Use your package manager's peer-dependency output to keep the installed versions compatible with the release you select.

UI v2 participates in the host application's normal MUI setup and theme. It does not require a package-specific stylesheet or provider.

## Start here

- [Getting started](gettingStarted.md) shows a browser and TrackSelect sharing one stable track store.
- [TrackSelect](trackSelect.md) explains catalogs, the selection lifecycle, customization, schema tooling, and troubleshooting.
