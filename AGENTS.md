# Genomebrowser

pnpm monorepo for an embeddable React genome browser.

## Knowledge base

Take patterns and implementation details from the code. [docs/README.md](docs/README.md) holds what the code cannot show: decisions, requirements, and vocabulary. Read [docs/glossary.md](docs/glossary.md) first on most tasks so you and the user use the same domain terms.

Then read what the change needs:

- Decisions lint cannot enforce, including React and embedded UI: [code standards](docs/design/code-standards.md)
- Package roles and philosophy: [architecture](docs/design/architecture.md), [feature placement](docs/design/feature-placement.md)
- Tests and handoff: [testing](docs/contributing/testing.md), [verify](docs/contributing/verify.md)
- Recorded decisions: [ADRs](docs/adr/README.md)

Before handing off a change, run `pnpm format`, `pnpm verify`, and `pnpm run doctor` from the repository root.

Consumer docs live in `packages/*/docs/` and ship with packages. Update them when public behavior changes (see [writing docs](docs/writing/README.md)). Before changing the Next.js app, read its installed `apps/web/node_modules/next/dist/docs/index.md` and follow that version.

Skills under `.agents/skills/` route into the knowledge base and add agent-only steps. Load the ones that match the task, including `github-contribution` before opening, editing, or commenting on any GitHub issue or PR.

When you run into an unrelated bug, flaky check, or agent/tooling snag while working (including while driving the app with `verify-web`), leave it out of the current PR, check open issues first, and suggest filing a GitHub issue at handoff. Skip minor style nits and speculative refactors.

When user-facing features in `@weng-lab/web` are added, changed, or removed, update `.agents/skills/verify-web/` (especially its `features/` map) in the same change so it reflects the **product** from the user's point of view, not internal code.

Before including changes from outside this session in a commit, ask the user whether to include them.
