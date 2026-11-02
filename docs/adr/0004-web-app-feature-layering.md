# ADR 0004: Web app feature layering

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

The product app mixes Next.js routing, workspace chrome, domain features, and server persistence. Without layering, UI components end up coordinating database and connection lifetimes.

## Decision

In `apps/web`:

- `app/`: thin Next.js routes and layout orchestration
- `features/`: product UI, operations, and feature server code
- `composition/`: concrete providers, navigation, server wiring
- `shared/workspace/`: generic layout/panels/theme without domain or browser-store imports

Features expose operations upward and must not import composition. Shared workspace must not import features. Database access stays in feature server modules and server composition.

## Consequences

Lint encodes these import rules with policy fixtures. New pages add a feature (or small route composition) plus a navigation entry; no central page registry. Session and agent lifetimes stay with their feature owners (`useSession`, agent remote control).
