# Standalone genome browser

This private Next.js App Router application is the deployed genome browser product. Experimental routes and custom browser setups belong in `apps/playground`.

The [sessions and persistence design](docs/sessions-and-persistence.md) separates implemented session behavior from planned guest storage and collection organization.

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

To enable authentication, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `apps/standalone/.env.local`. Use the same Clerk application and environment as API Console to share its user accounts. Shared accounts do not automatically establish cross-domain single sign-on; configure Clerk's multi-domain support separately if needed. Never expose the secret key with a `NEXT_PUBLIC_` prefix. An empty configuration template is in `.env.example`; merge it into existing local settings rather than overwriting them.

Without both keys, the site runs with public browsing only, hides account controls, and explains account unavailability on the authentication routes and dashboard. The proxy initializes Clerk when configured. Private pages, API handlers, and server actions must enforce authorization where they access private data; hiding a control does not secure it.

Provide both Clerk keys during production builds and at runtime. Next.js embeds the publishable key in the client bundle, so changing Clerk applications requires a rebuild. Configure production domains and enabled sign-in methods in Clerk before deploying. Restart the development server after changing keys.

## Saved sessions

On `/dashboard`, select **Create a session**, enter a name, and choose an assembly. Creation saves a session with the reference ruler and default gene track pinned at the top, then opens `/browser/[sessionId]`. The dashboard lists only the signed-in user's sessions and supports opening and deleting them. Accounts can have up to five sessions, including when requests create sessions concurrently.

The navbar shows the selected session's title, and its Browser link returns to that session from other pages. The tab remembers only the session ID, title, and owner in `sessionStorage`; browser and track state still load from PostgreSQL when opening the session. Selection is scoped to the signed-in account. Opening guest mode or deleting the selected session clears it.

Browser and track store changes automatically save the visible region, highlights, browser settings, and ordered track instances. Highlight colors, opacity, and style persist. Selection mode does not persist and starts as pan when reopening a session. The browser has no manual save button or session-name editor; names are chosen during creation. Guest tab storage remains unimplemented.

Autosave groups store notifications into 350 ms batches, captures a detached snapshot, and allows one write at a time. Edits made during a request are saved next with the returned revision. Unchanged persisted snapshots do not cause writes. Serialization and requests happen outside store notification handlers, and saving does not block browser interaction.

The database snapshot initializes the client stores when the session page loads. After that, data flows from the stores to `PUT /api/sessions/[sessionId]`; responses contain only save metadata or an error. Route-handler invalidation marks the dashboard and session page stale for future visits without refreshing the active page or hydrating the stores again.

The server derives ownership from Clerk for every read and mutation. The `sessions` table has a composite primary key of `owner_id` and `id`, plus a name, revision, timestamps, snapshot version, `browser_state` JSONB, and `track_state` JSONB. Both states update in one transaction. Store actions, module implementations, interaction callbacks, and fetched data stay out of storage. Server validation checks snapshot structure, registered assemblies, track IDs, and module configuration using the generated track JSON schema. Opening a session creates independent stores and restores application callbacks.

Updates must match the saved revision. A stale tab receives a conflict error instead of overwriting a newer save. Reloading discards local unsaved edits and loads the stored revision. Transient failures retry with increasing delays up to ten seconds while mounted. Conflicts, invalid snapshots, and authorization failures display an error and do not overwrite local state or retry indefinitely. Pending changes flush when the page is hidden or the session unmounts. Small requests use browser keepalive, but closing the browser before saving finishes is not guaranteed to preserve edits, especially large snapshots or requests queued behind an in-flight save. Routine saves run silently; only save failures display an alert. Session assembly is immutable.

## Custom tracks and collections

The dashboard has horizontal Sessions and Custom tracks / collections tabs. Each account has a custom collection per assembly. In the browser, **Add track** opens a scrollable list of track types with descriptions and schematic example previews. Selecting a type opens that module's settings in the creation dialog. URL fields use **Set** to confirm source changes. The draft stays separate from the browser until submission.

**Add track** saves the configuration to the signed-in account, then inserts a user-owned track at the top of the browser below pinned tracks. Validation and storage failures keep the draft open. Cancel discards it. Saved custom tracks appear in the dashboard and under **Saved custom tracks** in the add-track dialog, filtered to the current assembly. Adding one to another session creates an independent instance; later session edits do not change the collection entry.

Custom tracks require account and database configuration. Entries live in the `custom_tracks` table independently of sessions, with ownership derived from Clerk on every read and write. Creation retries with the same ID return the original entry. Source URLs must use HTTP or HTTPS; no file uploads are supported. CAVE is available only for hg38. Named collections, collection editing, and collection deletion remain unimplemented.

## Assembly registry

`features/browser/assembly.ts` owns the assembly picker, chromosome definitions, initial region, reference sequences, gene datasets, enabled collections, and search capabilities. Add assembly-specific resources and behavior there. Server creation, snapshot validation, and the browser use the same registry. Imported core presets and gene catalogs use data-only package entries so server code does not load React components.

The registry includes hg38 and mm10. hg38 uses the existing UCSC 2bit reference and GENCODE 40 comprehensive; mm10 uses GENCODE M25 comprehensive. No mm10 2bit URL is configured, so its ruler displays coordinates without reference bases. Mouse search currently supports coordinates only. Track collections are filtered by both the assembly and its configured collection IDs.

## PostgreSQL setup

Drizzle defines tables in `db/schema.ts` and tracks SQL migrations in `db/migrations/`. The application opens a bounded PostgreSQL connection pool lazily. Builds do not connect to the database. Missing `DATABASE_URL` produces an unavailable-storage state, while query failures produce a load error.

For local development, set `POSTGRES_PASSWORD` to a random password in `.env.local` and set `DATABASE_URL` to `postgresql://genomebrowser:PASSWORD@127.0.0.1:55432/genomebrowser`, replacing `PASSWORD` with the same URL-encoded password. Preserve the existing Clerk and application settings. The Compose service binds only to localhost and keeps data in a named volume.

```sh
pnpm standalone db:up
pnpm standalone db:migrate
pnpm standalone dev
```

`pnpm standalone db:down` stops PostgreSQL and preserves its data. For a hosted PostgreSQL instance, set its connection URL in the server's `DATABASE_URL` and apply migrations with `pnpm standalone db:migrate`. Use the provider's required TLS settings. Keep the URL server-side.

After changing the Drizzle schema, run `pnpm standalone db:generate`, review the generated SQL, and apply it with `pnpm standalone db:migrate`. This follows the [Drizzle migration workflow](https://orm.drizzle.team/docs/migrations). Never edit an applied migration.

`pnpm standalone test` checks serialization and action authorization. `pnpm standalone test:db` loads `.env.local` and runs PostgreSQL integration tests using `TEST_DATABASE_URL` if set, otherwise `DATABASE_URL`. These tests create and remove an isolated schema; they do not modify saved sessions. The database role needs schema-creation permission. Run them against a local or dedicated test database. Workspace verification runs the unit tests, not database integration tests.

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
