# Genome browser knowledge base

Repository guidance for maintainers and coding agents. These pages hold context the code cannot: decisions about the repo, shared vocabulary, product intent, contribution judgment, and principles that structure and lint do not enforce.

Consumer API documentation lives in each package's `docs/` and changes with the code. Application how-to lives in `apps/*/README.md` and `apps/web/docs/`.

## Authority order

1. **Code structure** (ownership and APIs visible in source)
2. **Lint** (including custom rules whose messages explain the fix)
3. **This knowledge base**
4. **Skills** (thin routers + agent-specific workflow)

If a skill and a doc disagree, fix the skill. If a doc restates what the code already shows, cut the doc.

## Read by task

| Task                                 | Start here                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Shared terms                         | [glossary.md](glossary.md)                                                                           |
| Non-lintable principles              | [code_standards.md](code_standards.md)                                                               |
| Why packages exist / how they relate | [architecture.md](architecture.md), [adr/](adr/README.md)                                            |
| Where a feature belongs              | [feature-placement.md](feature-placement.md)                                                         |
| Embedding UI conventions             | [interface-design.md](interface-design.md)                                                           |
| Designing a module or hook           | [module-design.md](module-design.md)                                                                 |
| Issues, PRs, commits                 | [contributing/](contributing/README.md)                                                              |
| Tests and `pnpm verify`              | [contributing/testing.md](contributing/testing.md), [contributing/verify.md](contributing/verify.md) |
| Turbo, deps, schemas, releases       | [tooling/](tooling/README.md)                                                                        |
| Writing package or maintainer docs   | [writing/](writing/README.md)                                                                        |
| App MVP and agent product intent     | [product/](product/README.md)                                                                        |

`AGENTS.md` at the repo root is a short pointer into this index. Skills under `.agents/skills/` load the pages they need; they do not copy policy.

## Reserved: incidents

A future `docs/incidents/` (or `docs/postmortems/`) section will hold write-ups of mistakes and outages so agents can avoid repeating them. **Do not create that directory until the first incident is recorded.** Product bugs stay in GitHub issues; ADRs record deliberate decisions.

## What does not belong here

- API tables, tutorials, and package troubleshooting (package `docs/`)
- Step-by-step local runbooks that belong in an app README
- Generic React or TypeScript textbooks
- Checklists that lint or tests already enforce
