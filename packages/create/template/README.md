# Genome Browser

This is an editable React application built with the Weng Lab genome browser packages and Vite.

TrackSelect uses MUI X Premium. If your use requires a license, set `VITE_MUI_X_LICENSE_KEY` in your environment.

## Run the app

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. The same scripts work through pnpm, Yarn, or Bun.

## Change the browser

- Edit `src/App.tsx` to change the page and choose which collection tracks load by default.
- Edit `src/stores.ts` to change the assembly or initial region. Add first-party or custom track modules to the exported `myModules` array.
- Edit `collections/default-tracks.json` to add, remove, or configure tracks. Its JSON Schema provides editor completion and validation.

Both the track store and the schema generator use `myModules`. Run `npm run schema` after changing that array. This regenerates `schemas/trackSelectCollection.schema.json`. You do not need to regenerate the schema after changing only collection entries.

The installed package guides are available in `node_modules/@weng-lab/genomebrowser/docs`, `node_modules/@weng-lab/genomebrowser-tracks/docs`, and `node_modules/@weng-lab/genomebrowser-ui/docs`.

## Host genomic files

This project does not serve genomic data files. Track URLs must use HTTP or HTTPS. The file server must support byte-range requests and return uncompressed partial responses. If the files use another origin, that server must also allow cross-origin browser requests.

## Check your changes

```sh
npm run format:check
npm run lint
npm run typecheck
npm run schema:check
npm run build
```
