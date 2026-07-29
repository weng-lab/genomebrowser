# Next.js genome browser comparison app

This standalone Next.js app provides the Next.js half of the framework comparison. It renders the shared genome browser experience and proxies transcript requests to the SCREEN GraphQL API.

Set `SCREEN_API_KEY` in `.env.local` to the SCREEN API key required for transcript data. The proxy reads the key only on the server and never sends it to client code.

Set `NEXT_PUBLIC_MUI_X_LICENSE_KEY` in `.env.local` to the MUI X Premium license key used by the track selector. The root layout registers the key on the client before rendering any route, so it applies to every MUI X component in the application. Restart the development server after changing the key.

From `packages/app`, run:

```sh
pnpm dev
pnpm build
pnpm start
```
