# ADR 0005: Independent package releases

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

Libraries evolve at different rates. Lockstep versioning forces unnecessary consumer upgrades and unclear changelogs.

## Decision

Publish core, tracks, UI, reader, and create with **independent** version histories and GitHub releases (`core-v*`, `tracks-v*`, …). Humans perform npm publish; agents prepare and verify. Dist-tag defaults to `latest` for stable releases. Coordinated multi-package releases are explicit, not inferred from matching numbers.

## Consequences

Release notes are per package from each package's last published baseline. Dependency minimums update only where consumers need them. The create template ships inside create and is considered in release scope when it changes. Details: [tooling/releases.md](../tooling/releases.md).
