# Maintainer documentation

These docs serve human maintainers and provide shared guidance for agents and their skills. Repository-local skills reference files here, so update their references and workflows when the guidance changes. Consumer API documentation lives in each package's `docs/` directory.

## Understand the project

Start with [architecture](project/architecture.md) for the project's purpose and structure. Use [feature placement](project/feature-placement.md) to decide where a change belongs and [interface design](project/design.md) for shared UI expectations.

## Contribute a change

[Contributing](contributing/README.md) covers issues, commits, PRs, and review expectations. [Testing](contributing/testing.md) explains what to test; [verification](contributing/verify.md) explains how to run checks.

## Maintain the tooling

- [Build orchestration](tooling/builds.md): task ownership and caching.
- [Dependencies](tooling/dependencies.md): shared dependency policy.
- [Collection schemas](tooling/collection-schemas.md): regeneration commands.
- [Releases](tooling/releases.md): version selection, preparation, and human publication.

## Write documentation

[Documentation guidance](documentation/README.md) explains where shared guidance belongs and links to writing references.

## Deferred cleanup

- [ ] Review React and playground skill consolidation.
- [ ] Review the old reader design prompt and Gene planning notes.
- [ ] Audit installation examples against their intended releases.
