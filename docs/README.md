# Knowledge base

Decisions, requirements, and vocabulary that the code cannot show. The code is the reference for patterns and implementation details; these pages record what the code must keep to and why. Consumer API docs ship in each package's `docs/`.

## Authority

1. Code structure and public APIs
2. Lint and tests, whose failures state the fix
3. This knowledge base
4. Skills, which route here and add agent-only steps

When a rule can be a type, a lint rule, or a test, make it one and delete the prose. When a page restates what the code shows, delete the page.

## Pages

| Topic                                 | Page                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Terms                                 | [glossary.md](glossary.md)                                                       |
| Decisions lint cannot enforce         | [code_standards.md](code_standards.md)                                           |
| Package roles and where features go   | [architecture.md](architecture.md), [feature-placement.md](feature-placement.md) |
| Recorded decisions                    | [adr/](adr/README.md)                                                            |
| App product intent and known gaps     | [product/](product/README.md)                                                    |
| Issues, PRs, commits                  | [contributing/](contributing/README.md)                                          |
| Tests and checks                      | [testing.md](contributing/testing.md), [verify.md](contributing/verify.md)       |
| Turbo, dependencies, schemas, release | [tooling/](tooling/README.md)                                                    |
| Writing package docs                  | [writing/](writing/README.md)                                                    |
