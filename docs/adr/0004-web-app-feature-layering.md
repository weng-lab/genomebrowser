# ADR 0004: Web app feature layering

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

The product app mixes Next.js routes, workspace chrome, domain features, and server persistence. Without clear layers, UI components end up managing database access and connection lifetimes directly.

## Decision

Layer `apps/web` as follows:

- `app/`: thin Next.js routes and layout wiring
- `features/`: product UI, client operations, and feature server code
- `composition/`: concrete providers, navigation, and server wiring
- `shared/workspace/`: generic frame layout and panels, with no domain or browser-store imports
- `shared/ui/`: app theme and shared presentational components with plain props

Features expose operations upward and must not import `composition/`. Shared modules must not import `features/`. Database access stays in feature server modules and server composition.

## Consequences

Lint enforces these import boundaries with policy fixtures. Adding a page means adding a feature (or thin route composition) and a navigation entry, with no central page registry. Session and agent lifetimes stay with their feature owners (`useSession`, agent remote control).
