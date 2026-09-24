# Standalone app architecture

The standalone app owns website navigation, accounts, sessions, and assembly-specific browser composition. Shared browser capabilities belong in the workspace packages; experiments belong in `apps/playground`.

## Code organization

Next.js routes and layouts live in `app/`. Routes load data, choose what to render for each state, and compose features; page-only components live in a private `_components/` folder beside the route. The `(auth)` route group keeps sign-in and sign-up pages together without changing their URLs. `proxy.ts` stays at the app root as required by Next.js.

Application code lives in `features/`, grouped by responsibility. Terms follow the [glossary](glossary.md).

| Folder                       | Owns                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `features/assemblies/`       | The assembly registry and each assembly's provided track collections.                                    |
| `features/session-snapshot/` | The session snapshot: its types, initial state, capture from stores, validation, and store restoration.  |
| `features/auth/`             | Clerk configuration, the provider, account controls, and owner resolution for server code.               |
| `features/sessions/`         | Saved sessions: storage, server actions and queries, autosave, the active session, and the session list. |
| `features/custom-tracks/`    | Custom tracks: the track catalog, the add-track dialog, storage, and the custom track list.              |
| `features/browser/`          | The genomic workspace, composing the browser, toolbar, autosave, and add-track dialog.                   |
| `features/site/`             | The site header, footer, theme, and MUI X license.                                                       |
| `components/`                | App-wide UI primitives with no feature knowledge, such as `SiteLink`.                                    |
| `lib/`                       | Small shared utilities with no feature knowledge.                                                        |
| `db/`                        | The database client, Drizzle schema, and migrations.                                                     |

### Public files and dependency rules

A feature's top-level files are its public interface. Subfolders such as `server/`, `components/`, `autosave/`, and `add-track/` are internal to their feature. Import other areas through the `@/` alias, and files in the same feature by relative path.

Dependencies point one way:

```
assemblies        → (packages only)
session-snapshot  → assemblies
auth              → (packages only)
sessions          → session-snapshot, assemblies, auth
custom-tracks     → session-snapshot, assemblies, auth
browser           → sessions, custom-tracks, session-snapshot, assemblies
site              → sessions, auth
components, lib   → (packages only)
db                → session-snapshot types
app               → any feature's public files
```

Any area may use `components/` and `lib/`. `test/architecture.test.ts` enforces these rules. Change the rules there and here together.

Files that import `server-only` are server code. Keep client-safe constants, such as `features/sessions/rules.ts`, separate from server validation so client bundles do not load it.

### Where changes belong

| Change                                                   | Location                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A new page or route handler                              | `app/`, composing public feature files.                                                                                           |
| A new assembly, reference source, or provided collection | `features/assemblies/`.                                                                                                           |
| A new persisted browser setting                          | The snapshot types, capture, and validation in `features/session-snapshot/`. Existing saved sessions must still parse.            |
| A new creatable track type                               | An entry in `features/custom-tracks/catalog.ts`. Typechecking fails until every first-party module has one.                       |
| A server operation on private data                       | The owning feature's `actions.ts` or `queries.ts`, resolving the owner with `requireOwner`, with storage in its `server/` folder. |
| A database column or table                               | `db/schema.ts`, then generate a migration as described in [local development](localDevelopment.md#migrations-and-checks).         |

Run `pnpm standalone typecheck`, `pnpm standalone lint`, and `pnpm standalone test` while iterating, `pnpm standalone test:db` after storage changes, and `pnpm verify` before handoff.

## Website and accounts

The home page at `/` is an empty placeholder within the site layout. `/browser` contains the full-width genomic workspace. Both routes are public and share navigation, a footer, and the application's MUI theme.

Clerk provides optional accounts through `/sign-in` and `/sign-up`, including nested authentication steps. Signed-in users open a small MUI account menu with their name, primary email, and a sign-out action for the current session. The Delete account item explains that the account is shared and links to API Console, which owns account deletion and API-key cleanup. The standalone app does not render Clerk's profile or API-key management UI; it does not disable those features in the shared Clerk application. Authentication defaults to returning users to `/browser` while preserving explicit return destinations. Signed-in users can create and save sessions from the dashboard when PostgreSQL is configured.

The Clerk proxy initializes only when both keys are configured. Private pages, API handlers, and server actions enforce ownership when accessing private data. See [local development](localDevelopment.md#2-configure-the-app) for account configuration.

## Assembly registry

`features/assemblies/assemblies.ts` owns the assembly picker, chromosome definitions, initial region, reference sequences, gene datasets, and search capabilities. Server creation, snapshot validation, and the browser use the same registry. Imported core presets and gene catalogs use data-only package entries so server code does not load React components. Provided collections live in `features/assemblies/trackCollections.ts`, apart from the registry, so server code does not load collection JSON.

The registry includes hg38 and mm10. hg38 uses the existing UCSC 2bit reference and GENCODE 40 comprehensive; mm10 uses GENCODE M25 comprehensive. No mm10 2bit URL is configured, so its ruler displays coordinates without reference bases. Mouse search currently supports coordinates only. Both assemblies provide their reference gene collection; hg38 also provides ENCODE human biosamples.

## Browser controls

The shared `ControlToolbar` from `@weng-lab/genomebrowser-ui` groups Region, Navigate, Interaction, and Manage in matching outlined sections. Click the live coordinates to open GenomeSearch; Escape or clicking away cancels editing. The current viewport remains visible while searching and follows all browser navigation. A separate copy action copies coordinates. Pan and zoom each use two direction buttons and a magnitude selector. Highlights and Tracks open the existing dialogs. Groups wrap on narrow screens.

The reference Gene collection uses the first-party dataset catalog for the browser assembly, with GENCODE 40 comprehensive selected by default on hg38. Other catalog releases can be added as independent tracks. The servers must support byte-range and cross-origin requests.

`GenomeSearch` sends requests to `/api/screen-graphql`. That server route adds `SCREEN_API_KEY` as a bearer token before forwarding requests to the SCREEN GraphQL API.

The root layout registers the MUI X license and wraps the application in MUI's `AppRouterCacheProvider`. This collects streamed Emotion styles during server rendering and inserts them into the document head. Keep browser controls inside this provider to preserve matching server and client markup.

See [session persistence](sessionPersistence.md) for saved-state behavior. Return to [standalone docs](README.md).
