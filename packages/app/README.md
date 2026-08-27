# Next.js genome browser comparison app

This standalone Next.js app provides the Next.js half of the framework comparison. It renders the shared genome browser experience with a GENCODE BigGenePred gene track.

The reference gene track reads `https://users.wenglab.org/mezaj/gencode.v40.comprehensive.bigGenePredPlusV1.bb`. The server must support byte-range and cross-origin requests.

Set `NEXT_PUBLIC_MUI_X_LICENSE_KEY` in `.env.local` to the MUI X Premium license key used by the track selector. The root layout registers the key on the client before rendering any route, so it applies to every MUI X component in the application. Restart the development server after changing the key.

From `packages/app`, run:

```sh
pnpm dev
pnpm build
pnpm start
```
