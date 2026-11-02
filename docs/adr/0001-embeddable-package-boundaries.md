# ADR 0001: Embeddable package boundaries

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

The lab needs an embeddable React genome browser reusable across websites, plus optional UI controls and a first-party track set, without forcing every product workflow into the library.

## Decision

Split published libraries by responsibility:

- `packages/core`: runtime, state, track-module contracts
- `packages/reader`: genomic file access independent of the browser
- `packages/tracks`: first-party modules using core + reader
- `packages/ui`: optional embedding controls
- `packages/create`: starter for consumers

Applications and private app packages live under `apps/`. Archived apps live under `legacy/` outside the workspace.

Core must not depend on tracks, UI, or apps. Reader must not depend on React or higher packages. Apps depend on libraries through public package exports.

## Consequences

Feature placement asks whether a capability is general (core), format-specific (tracks/reader), embedding chrome (UI), or product-specific (apps). Lint enforces import direction. Growing core for one website's dataset is out of policy.
