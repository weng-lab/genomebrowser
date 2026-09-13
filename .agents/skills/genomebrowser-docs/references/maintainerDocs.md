# Maintainer documentation

Keep root maintainer docs lightweight and actionable. Record decisions, repository patterns, constraints, contributor workflows, ownership, and implementation guidance that agents and maintainers need to change the code safely. Do not turn maintainer docs into user guides or duplicate package API references.

Use this target organization:

- `docs/README.md`: maintainer entry point and document authority/navigation.
- `docs/architecture.md`: current package boundaries, state/data flow, invariants, and their rationale.
- `docs/core/`, `docs/tracks/`, `docs/ui/`, and `docs/reader/`: subsystem explanations and debugging guidance where needed. Put first-party track guidance under tracks, not core.
- `docs/development/`: testing, dependency policy, build/cache behavior, and release workflow.
- `docs/decisions/`: indexed architectural decision history.
- App READMEs: application purpose, configuration, execution, deployment, and integration boundaries.

Current architecture documentation is the operational authority; ADRs explain how and why decisions were made. Verify claims against implementation and resolve contradictions explicitly. For ADR audits, classify decisions as current, superseded, historical, or needing verification. Preserve meaningful history and link superseded decisions forward rather than silently rewriting the past. When an ADR change is in scope, record context, decision, alternatives, and consequences; ordinary edits do not require a new ADR.

Keep `CONTRIBUTING.md` focused on the GitHub contribution workflow and link detailed development policies. Keep `DESIGN.md` focused on actionable UI policy and examples that distinguish acceptable implementations; architecture and subsystem implementation details belong in their respective maintainer pages.

Label proposals and exploratory material explicitly. They must not look like supported APIs or current architectural requirements. Promote verified guidance into its canonical home; retire material that no longer serves a reader.
