# Standalone genome browser

This private Next.js App Router application is the deployed genome browser product. Experimental routes and custom browser setups belong in `apps/playground`.

The standalone toolbar prototype groups Region, Navigate, Interaction, and Manage in matching outlined sections. Click the live coordinates to open GenomeSearch; Escape or clicking away cancels editing. The current viewport remains visible while searching and follows all browser navigation. A separate copy action copies coordinates. Pan and zoom each use two direction buttons and a magnitude selector. Highlights and Tracks open the existing dialogs. Groups wrap on narrow screens. This prototype is app-local while its design is evaluated for the UI package.

The reference Gene collection uses the first-party dataset catalog for the browser assembly, with GENCODE 40 comprehensive selected by default on hg38. Other catalog releases can be added as independent tracks. The servers must support byte-range and cross-origin requests.

Set `NEXT_PUBLIC_MUI_X_LICENSE_KEY` in `.env.local` to the MUI X Premium license key used by the track selector. The root layout registers the key on the client before rendering any route, so it applies to every MUI X component in the application. Restart the development server after changing the key.

From the repository root, a human maintainer can run:

```sh
pnpm standalone dev
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-standalone
```

Automation agents must not start the development server.
