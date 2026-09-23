# Standalone genome browser

This private Next.js App Router application is the deployed genome browser product. Experimental routes and custom browser setups belong in `apps/playground`.

## File organization

Next.js routes and layouts live in `app/`. The `(auth)` route group keeps sign-in and sign-up pages together without changing their URLs. `proxy.ts` stays at the app root as required by Next.js.

Application code is grouped by responsibility:

- `features/auth/` owns the Clerk provider, configuration checks, account controls, and unavailable-account state.
- `features/browser/` owns the browser workspace, assembly, track collections, and browser-specific components and hooks.
- `features/site/` owns shared navigation, the footer, theme, MUI license setup, and the Next.js link adapter.

Keep feature imports explicit so server-only auth configuration stays separate from client components.

## Website and accounts

The home page at `/` is an empty placeholder within the site layout. `/browser` contains the full-width genomic workspace. Both routes are public and share navigation, a footer, and the application's MUI theme.

Clerk provides optional accounts through `/sign-in` and `/sign-up`, including nested authentication steps. Signed-in users open a small MUI account menu with their name, primary email, and a sign-out action for the current session. The Delete account item explains that the account is shared and links to API Console, which owns account deletion and API-key cleanup. The standalone app does not render Clerk's profile or API-key management UI; it does not disable those features in the shared Clerk application. Authentication defaults to returning users to `/browser` while preserving explicit return destinations. Accounts do not yet save browser sessions or tracks.

To enable authentication, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `apps/standalone/.env.local`. Use the same Clerk application and environment as API Console to share its user accounts. Shared accounts do not automatically establish cross-domain single sign-on; configure Clerk's multi-domain support separately if needed. Never expose the secret key with a `NEXT_PUBLIC_` prefix. An empty configuration template is in `.env.example`; merge it into existing local settings rather than overwriting them.

Without both keys, the site runs with public browsing only, hides account controls, and explains account unavailability on the authentication routes. The proxy initializes Clerk when configured but does not restrict public routes. Future private pages, API handlers, and server actions must enforce authorization where they access private data; hiding a control does not secure it.

Provide both Clerk keys during production builds and at runtime. Next.js embeds the publishable key in the client bundle, so changing Clerk applications requires a rebuild. Configure production domains and enabled sign-in methods in Clerk before deploying. Restart the development server after changing keys.

## Browser controls

The shared `ControlToolbar` from `@weng-lab/genomebrowser-ui` groups Region, Navigate, Interaction, and Manage in matching outlined sections. Click the live coordinates to open GenomeSearch; Escape or clicking away cancels editing. The current viewport remains visible while searching and follows all browser navigation. A separate copy action copies coordinates. Pan and zoom each use two direction buttons and a magnitude selector. Highlights and Tracks open the existing dialogs. Groups wrap on narrow screens.

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

The root layout wraps the application in MUI's `AppRouterCacheProvider` so streamed Emotion styles are collected during server rendering and inserted into the document head. Keep browser controls inside this provider to preserve matching server and client markup.
