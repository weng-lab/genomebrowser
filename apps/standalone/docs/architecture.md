# Standalone app architecture

The standalone app owns website navigation, accounts, sessions, and assembly-specific browser composition. Shared browser capabilities belong in the workspace packages; experiments belong in `apps/playground`.

## File organization

Next.js routes and layouts live in `app/`. The `(auth)` route group keeps sign-in and sign-up pages together without changing their URLs. `proxy.ts` stays at the app root as required by Next.js.

Application code is grouped by responsibility:

- `features/auth/` owns the Clerk provider, configuration checks, account controls, and unavailable-account state.
- `features/browser/` owns the browser workspace, assembly, track collections, and browser-specific components and hooks.
- `features/custom-tracks/` owns the track creation dialog, account-owned collection entries, and their persistence.
- `features/sessions/` owns saved-session types, authenticated queries, the database adapter boundary, and the dashboard.
- `features/site/` owns shared navigation, the footer, theme, MUI license setup, and the Next.js link adapter.

Keep feature imports explicit so server-only auth configuration stays separate from client components.

## Website and accounts

The home page at `/` is an empty placeholder within the site layout. `/browser` contains the full-width genomic workspace. Both routes are public and share navigation, a footer, and the application's MUI theme.

Clerk provides optional accounts through `/sign-in` and `/sign-up`, including nested authentication steps. Signed-in users open a small MUI account menu with their name, primary email, and a sign-out action for the current session. The Delete account item explains that the account is shared and links to API Console, which owns account deletion and API-key cleanup. The standalone app does not render Clerk's profile or API-key management UI; it does not disable those features in the shared Clerk application. Authentication defaults to returning users to `/browser` while preserving explicit return destinations. Signed-in users can create and save sessions from the dashboard when PostgreSQL is configured.

The Clerk proxy initializes only when both keys are configured. Private pages, API handlers, and server actions enforce ownership when accessing private data. See [local development](localDevelopment.md#2-configure-the-app) for account configuration.

## Assembly registry

`features/browser/assembly.ts` owns the assembly picker, chromosome definitions, initial region, reference sequences, gene datasets, enabled collections, and search capabilities. Add assembly-specific resources and behavior there. Server creation, snapshot validation, and the browser use the same registry. Imported core presets and gene catalogs use data-only package entries so server code does not load React components.

The registry includes hg38 and mm10. hg38 uses the existing UCSC 2bit reference and GENCODE 40 comprehensive; mm10 uses GENCODE M25 comprehensive. No mm10 2bit URL is configured, so its ruler displays coordinates without reference bases. Mouse search currently supports coordinates only. Track collections are filtered by both the assembly and its configured collection IDs.

## Browser controls

The shared `ControlToolbar` from `@weng-lab/genomebrowser-ui` groups Region, Navigate, Interaction, and Manage in matching outlined sections. Click the live coordinates to open GenomeSearch; Escape or clicking away cancels editing. The current viewport remains visible while searching and follows all browser navigation. A separate copy action copies coordinates. Pan and zoom each use two direction buttons and a magnitude selector. Highlights and Tracks open the existing dialogs. Groups wrap on narrow screens.

The reference Gene collection uses the first-party dataset catalog for the browser assembly, with GENCODE 40 comprehensive selected by default on hg38. Other catalog releases can be added as independent tracks. The servers must support byte-range and cross-origin requests.

`GenomeSearch` sends requests to `/api/screen-graphql`. That server route adds `SCREEN_API_KEY` as a bearer token before forwarding requests to the SCREEN GraphQL API.

The root layout registers the MUI X license and wraps the application in MUI's `AppRouterCacheProvider`. This collects streamed Emotion styles during server rendering and inserts them into the document head. Keep browser controls inside this provider to preserve matching server and client markup.

See [session persistence](sessionPersistence.md) for saved-state behavior. Return to [standalone docs](README.md).
