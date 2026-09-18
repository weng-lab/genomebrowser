# Maintainer documentation

Maintainer docs help people and agents decide where a feature belongs, how to approach a change, and how to contribute. Keep them small and focused on judgment, policy, and rationale. Avoid turning code into prose through function inventories, source-directory walkthroughs, or detailed execution sequences. Include implementation detail only when it explains a decision the reader needs to make.

## Ordering and navigation

Use `01-project`, `02-contributing`, `03-tooling`, and `04-documentation` for the maintainer sections. Keep a `README.md` in each folder with its purpose, page links, and a parent link. Number the project reading path as architecture, feature placement, then interface design. Other maintainer pages remain unnumbered and follow their index order.

## Give each page a clear purpose

- `docs/README.md` provides the starting point, reading order, and document authority.
- `docs/01-project/01-architecture.md` explains the project's audience, design philosophy, major parts, and how they fit together. Keep the system overview high-level.
- `docs/01-project/02-feature-placement.md` helps maintainers decide where new capabilities belong. Use examples to illustrate judgment rather than prescribe speculative designs.
- `docs/02-contributing/` covers contributions, testing, and verification.
- `docs/03-tooling/` covers build maintenance, dependencies, schemas, and releases.
- `docs/04-documentation/` holds shared writing guidance and reference material.

Contribution guidance lives in `docs/02-contributing/README.md`. Document repository-specific judgment and workflows; do not add pages that merely restate general software engineering practice. Keep `docs/01-project/03-design.md` focused on project-specific interface decisions. App READMEs explain application purpose, configuration, execution, deployment, and integration boundaries. Package documentation teaches consumers through the public APIs and must stand independently of the repository.

## Architecture, feature placement, and decisions

Architecture explains the system and the design reasoning behind its structure. Feature-placement guidance applies that reasoning to proposed changes. An ADR records a significant design decision: its context, alternatives, decision, and consequences. Not every principle or routine implementation choice needs an ADR.

Use maintainer discussion as evidence of intent. Use code and tests as evidence of implemented behavior. When those differ, state the distinction rather than rewriting intent to match existing code or implying that a proposed change has shipped. Do not invent rejected alternatives or historical reasoning; mark unanswered questions in a candidate record.

For ADR audits, distinguish current, superseded, historical, and unverified records. Preserve meaningful history and link superseded records forward rather than silently rewriting the past. Migrate an old ADR only when its reasoning remains useful. Draft candidates are not accepted architecture.

Label proposals and exploratory material explicitly. Current architecture and policy pages guide ongoing work; ADRs explain the choices behind them. Keep temporary audit checklists and migration reminders out of permanent guidance.

For the division between shared documents, skills, and AGENTS.md, see [Documentation and agent guidance](README.md).
