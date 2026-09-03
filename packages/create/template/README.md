# Genome Browser

This is an editable React application built with the Weng Lab genome browser packages and Vite.

TrackSelect uses MUI X Premium. If your use requires a license, set `VITE_MUI_X_LICENSE_KEY` in your environment.

Gene, SNP, and cCRE search uses the SCREEN GraphQL API. Copy `.env.example` to `.env.local`, then set `SCREEN_API_KEY` before starting Vite. The included development proxy keeps that key out of browser code. Coordinate search works without an API key.

## Run the app

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. The same scripts work through pnpm, Yarn, or Bun.

## Change the browser

- Edit `src/App.tsx` to change the page and choose which collection tracks load by default.
- Edit `src/stores.ts` to change the assembly or initial region. Add first-party or custom track modules to the exported `myModules` array.
- Edit `src/components/RegionNavigation.tsx` to change the available genome search result types.
- Edit `collections/default-tracks.json` to add, remove, or configure tracks. Its JSON Schema provides editor completion and validation.

Both the track store and the schema generator use `myModules`. Run `npm run schema` after changing that array. This regenerates `schemas/trackSelectCollection.schema.json`. You do not need to regenerate the schema after changing only collection entries.

The installed package guides are available in `node_modules/@weng-lab/genomebrowser/docs`, `node_modules/@weng-lab/genomebrowser-tracks/docs`, and `node_modules/@weng-lab/genomebrowser-ui/docs`.

The Vite proxy is for local development only. In production, provide a same-origin `POST /api/screen-graphql` endpoint that forwards requests to `https://screen.api.wenglab.org/graphql` and adds `Authorization: Bearer <SCREEN_API_KEY>` on the server. Never expose the API key through a `VITE_` environment variable.

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
