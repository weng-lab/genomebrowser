# Genome browser project

## Package documentation

Before changing a package integration, read the relevant installed documentation:

- `node_modules/@weng-lab/genomebrowser/docs/README.md` — runtime, stores, assemblies, and custom track modules.
- `node_modules/@weng-lab/genomebrowser-tracks/docs/README.md` — built-in tracks, configuration, settings, and data sources.
- `node_modules/@weng-lab/genomebrowser-ui/docs/README.md` — track selection, navigation, and highlights.

Template-specific guidance is in `docs/`, including production search setup in `docs/deployment.md`.

## Verification

Run these checks before finishing:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run schema:check
npm run build
```

For UI changes, also verify the affected workflow in the browser, including narrow-screen layout. Report anything you could not verify.

After changing registered track modules, run `npm run schema` and include the generated schema. Do not edit it by hand. Collection-entry changes alone do not require regeneration.

## Non-obvious constraints

- Zustand store names must begin with `use`; React tooling treats them as hooks.
- `TrackSelect` initializes default tracks on mount, even while closed. Conditional mounting delays initialization; remounting can reset selection.
- The Vite search proxy is development-only. Production needs a server endpoint; keep `SCREEN_API_KEY` server-side, never in a `VITE_` variable.
- Do not invent genomic data URLs. Use supplied or existing URLs, or `YOUR_URL_HERE` in examples.
