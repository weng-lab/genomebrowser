# Standalone genome browser

This private Next.js App Router application is the deployed genome browser product. Experimental routes and custom browser setups belong in `apps/playground`.

The reference Gene collection uses the first-party dataset catalog for the browser assembly, with GENCODE 40 comprehensive selected by default on hg38. Other catalog releases can be added as independent tracks. The servers must support byte-range and cross-origin requests.

## Environment configuration

Set `SCREEN_API_KEY` in `apps/standalone/.env.local` for gene, SNP, and cCRE search in the toolbar's `GenomeSearch` component. Obtain a key from the [Weng Lab console](https://console.wenglab.org/). Coordinate search works without a key.

`GenomeSearch` sends requests to `/api/screen-graphql`. The server route in `app/api/screen-graphql/route.ts` reads `SCREEN_API_KEY` and adds it as a bearer token when forwarding requests to the SCREEN GraphQL API. Keep this key server-side, without a `NEXT_PUBLIC_` prefix. For deployment, set it in the hosting server's environment. Restart the development server after changing local environment variables.

Set `NEXT_PUBLIC_MUI_X_LICENSE_KEY` in `.env.local` to the MUI X Premium license key used by the track selector. The root layout registers the key on the client before rendering any route, so it applies to every MUI X component in the application. Restart the development server after changing the key.

## Run and build

```sh
pnpm standalone dev
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-standalone
```
