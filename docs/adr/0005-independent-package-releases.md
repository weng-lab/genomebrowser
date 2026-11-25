# ADR 0005: Independent package releases

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

The published libraries evolve at different rates. Releasing them in lockstep forces unnecessary consumer upgrades and muddies changelogs.

## Decision

Publish core, tracks, UI, reader, and create with **independent** version histories and GitHub releases (`core-v*`, `tracks-v*`, and so on). Agents prepare and verify releases; humans run npm publish. Stable releases publish under the `latest` dist-tag. Multi-package releases are coordinated explicitly rather than inferred from matching version numbers.

## Consequences

Each package's release notes cover changes since its own last published version. Dependency minimums rise only when consumers need a newer version. Because the starter template ships inside `create`, template changes put `create` in release scope. See [tooling/releases.md](../tooling/releases.md) for the release steps.
