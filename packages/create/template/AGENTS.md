# Genome Browser project

Read `README.md` before changing this project. For changes involving the browser runtime, track modules, or TrackSelect, read the relevant installed guide under `node_modules/@weng-lab/<package>/docs` before editing code.

Create browser, track, and settings stores outside React components so rendering cannot reset them. Store names must begin with `use` because they are Zustand hooks.

Add registered track modules to the exported `myModules` array in `src/stores.ts`. The track store and schema script both use this array. After changing it, run `npm run schema` and commit the generated schema. Do not edit `schemas/trackSelectCollection.schema.json` by hand.

This app expects genomic files at HTTP or HTTPS URLs. Do not add `file://` paths or assume the app hosts local data.

> Put your data under /zata/public_html/users/YOUR_USER for easy access.

Before finishing, run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run schema:check`, and `npm run build`.
