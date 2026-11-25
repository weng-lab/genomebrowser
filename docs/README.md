# Knowledge base

Decisions, requirements, and vocabulary that the code cannot show. The code is the reference for patterns and implementation details; these pages record what the code must keep to and why. Consumer API docs ship in each package's `docs/`.

## Where rules belong

Enforce a rule as high in this list as possible:

1. **Code and types** — shape APIs and structure so invalid usage fails to compile or is hard to write.
2. **Lint and tests** — catch violations automatically, with failure messages that state the fix.
3. **This knowledge base** — record only decisions, requirements, and vocabulary that code and checks cannot enforce.
4. **Skills** — route here and add agent-only workflow steps without duplicating rules.

When a rule can become a type, lint rule, or test, move it there and delete the prose. When a page restates what the code shows, delete the page.

## Pages

| Topic                                 | Page                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Terms                                 | [glossary.md](glossary.md)                                                       |
| Decisions lint cannot enforce         | [code-standards.md](design/code-standards.md)                                                |
| Package roles and where features go   | [architecture.md](design/architecture.md), [feature-placement.md](design/feature-placement.md) |
| Recorded decisions                    | [adr/](adr/README.md)                                                            |
| Issues, PRs, commits                  | [contributing/](contributing/README.md)                                          |
| Tests and checks                      | [testing.md](contributing/testing.md), [verify.md](contributing/verify.md)       |
| Turbo, dependencies, schemas, release | [tooling/](tooling/README.md)                                                    |
| Writing package docs                  | [writing/](writing/README.md)                                                    |
