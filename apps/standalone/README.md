# Standalone genome browser

This private Next.js App Router application is the deployed genome browser product. Experimental routes and custom browser setups belong in `apps/playground`.

The reference gene track reads `https://users.wenglab.org/mezaj/gencode.v40.comprehensive.bigGenePredPlusV1.bb`. The server must support byte-range and cross-origin requests.

Set `NEXT_PUBLIC_MUI_X_LICENSE_KEY` in `.env.local` to the MUI X Premium license key used by the track selector. The root layout registers the key on the client before rendering any route, so it applies to every MUI X component in the application. Restart the development server after changing the key.

From the repository root, a human maintainer can run:

```sh
pnpm standalone dev
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-standalone
```

Automation agents must not start the development server.
