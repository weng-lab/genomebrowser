# ADR 0001: Embeddable package boundaries

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

The lab needs an embeddable React genome browser that can be reused across websites, with optional UI controls and a first-party track set, without pulling every product workflow into the core library.

## Decision

Split the published libraries by responsibility:

- `packages/core`: browser runtime, state, and track-module contracts
- `packages/reader`: genomic file access, usable without the browser
- `packages/tracks`: first-party track modules built on core and reader
- `packages/ui`: optional embedding controls
- `packages/create`: starter generator for consumers

Applications and private app packages live under `apps/`. Archived apps live under `legacy/` outside the pnpm workspace.

Core must not depend on tracks, UI, or apps. Reader must not depend on React or higher packages. Apps depend on libraries only through their public package exports.

## Consequences

Every new feature starts by asking whether it belongs in core (general browser capability), tracks or reader (format-specific), UI (reusable embedding chrome), or an app (product-specific). Lint enforces import direction. Growing core for one website's dataset is out of policy.
