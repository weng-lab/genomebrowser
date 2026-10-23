# Feature boundaries

The app separates live browser state, saved sessions, identity, and agent command delivery. That lets product features grow without making a UI component coordinate database requests or connection lifetimes. This page describes those responsibilities; [MVP scope](mvp.md) decides which features ship.

## Where responsibilities live

In `apps/web`, `features/` owns product UI, operations, and feature-specific server code. `app/` contains Next.js routes and layout composition. `shared/` contains infrastructure and presentation used across features. `composition/` selects concrete dependencies and mounts providers.

Features expose operations to routes and composition. Shared workspace components handle layout rather than genome-browser behavior. The dependency direction keeps a feature usable without importing its callers and keeps generic presentation independent of product state.

## Identity and saved data

Clerk owns account identity and profile data. Current saved sessions record the Clerk user ID as owner; server operations derive the acting identity and check ownership. The browser does not select the acting account.

Sessions own their persistence and autosave lifecycle. The MVP also needs personal collections, the account-wide agent setting, and guest restoration. Their implementation details remain open. Guest sessions need a separate access model; they cannot simply be treated as authenticated Clerk accounts.

The session feature owns complete operations such as opening, switching, saving, and deleting. That is where coordination between outstanding writes and store replacement belongs. UI components consume those operations without reproducing their ordering rules.

## Composition and lifetimes

Next.js server composition supplies database access and authenticated identity. Client composition supplies browser stores and session data operations. Local development uses mock identity and local PostgreSQL through the same feature operations; production targets Clerk and PostgreSQL on Cloud SQL. Deployment validation is tracked in [limitations](limitations.md).

The browser tab owns live browser and track stores. Effect manages session restoration and background saving, and the agent feature owns its connection lifecycle. The intended agent-control and off-setting behavior is described in [agent access and control](agent-auth.md); an existing connection is not evidence that those controls are implemented.

## Assemblies, tracks, and contracts

Assemblies resolve supported genomes and their starting configuration. Track modules and the registry provide creation and configuration validation. Sessions persist track configurations and restore them through those capabilities. Supported assemblies and starter tracks are application policy.

The private `@weng-lab/contracts` package contains browser-safe command schemas and types. The web app implements browser commands against its stores; the MCP server delivers them to connected tabs. The server has no session database. This keeps transport separate from both persistence and live browser behavior.

## Enforcement and working guidance

Import restrictions and cycle checks live in [the root lint configuration](../../.oxlintrc.json). They cover feature-to-composition imports, shared presentation dependencies, database access locations, cross-app imports, and contract dependencies. [Policy tests](../../tools/lint/policy.test.mjs) exercise allowed and forbidden imports through the actual lint CLI. `pnpm lint` and `pnpm verify` include these checks.

Those checks enforce dependency structure, not product behavior. Session ownership, revisions, and snapshot validity are enforced by runtime operations and schemas and exercised by tests. Planned behavior such as guest authorization and the agent off switch still needs corresponding implementation and tests.

The [app-development skill](../../.agents/skills/app-development/SKILL.md) guides app changes through the relevant product context and verification. The [architecture-design skill](../../.agents/skills/architecture-design/SKILL.md) covers responsibilities and interface choices that require judgment. Detailed placement guidance remains in [feature placement](../01-project/02-feature-placement.md).

[Back to app direction](README.md)
