# Maintainer documentation

These docs contain repository guidance for maintainers and agents. Repository-local skills reference files here, so update their references and workflows when the guidance changes. Consumer API documentation lives in each package's `docs/` directory.

## Understand the project

[Project glossary](glossary.md) defines shared vocabulary for browser concepts and implementation details.

[Project guidance](01-project/README.md) provides the suggested reading order.

Start with [architecture](01-project/01-architecture.md) for the project's purpose and structure. Use [feature placement](01-project/02-feature-placement.md) to decide where a change belongs and [interface design](01-project/03-design.md) for shared UI expectations. Use [module design](01-project/module-design.md) for responsibilities and interfaces within a package.

[Draft effects/state-machines ADR](adr/0001-restrict-effects.md) records the Oct 29 spike proposal and links to reproducible evidence. It is not accepted policy.

## Understand the app

[MVP scope](05-app/mvp.md) owns the app product vision and launch scope. [App direction](05-app/README.md) connects that vision to feature context, current implementation, and deployment limitations. Repository skills guide implementation work; lint, schemas, runtime checks, and tests enforce the rules they can express.

## Contribute a change

[Contributing](02-contributing/README.md) covers issues, commits, PRs, and review expectations. [Testing](02-contributing/testing.md) explains what to test; [verification](02-contributing/verify.md) explains how to run checks.

## Maintain the tooling

[Tooling index](03-tooling/README.md) collects the maintenance guides.

- [Build orchestration](03-tooling/builds.md): task ownership and caching.
- [Dependencies](03-tooling/dependencies.md): shared dependency policy.
- [Collection schemas](03-tooling/collection-schemas.md): regeneration commands.
- [Releases](03-tooling/releases.md): version selection, preparation, and human publication.

## Write documentation

[Documentation guidance](04-documentation/README.md) explains where shared guidance belongs and links to writing references.

Return to [Repository overview](../README.md).
