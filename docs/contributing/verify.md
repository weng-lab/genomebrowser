# Verifying changes

Before handing off a change, run from the repository root:

```sh
pnpm format
pnpm verify
pnpm run doctor
```

`pnpm verify` runs formatting checks, lint, builds, and tests for the whole workspace through Turbo, reusing cached results for unchanged packages. While iterating, run one package's scripts instead, such as `pnpm core test`.

A failed formatting check is work to finish, not a result to report: run `pnpm format`, review the diff, and verify again.

Web database, relay, and MCP tests are skipped locally without test servers; see [the web app README](../../apps/web/README.md#tests). Run them when a change touches persistence or agent commands. CI always runs them.

`pnpm verify` does not run the browser tests (`pnpm tracks test:e2e`) or the Rust converter's tests (`cargo test --manifest-path tools/gtf-to-big-gene-pred-plus/Cargo.toml --locked`). Run them when you change what they cover.

## Lint

Lint errors state their fix. When an exception is intended, use `oxlint-disable-next-line <rule> -- <reason>`; unused suppressions fail lint. Use `react-doctor-disable-next-line` for React Doctor-only exceptions.

Handle a promise's rejection where its lifetime is owned. Do not add catch-and-log helpers just to satisfy `no-floating-promises`; a narrow suppression with its reason is better.

Import boundaries live in `.oxlintrc.json`, with allowed and forbidden examples in `tools/lint/policy.test.mjs`. Change both together.

## React Doctor

`pnpm run doctor` is a diagnostic, not part of `pnpm verify`, and its CI job does not block merging. Report findings your change caused; leave existing ones for separate work. CI and local versions can disagree, so compare versions before acting on a difference.

## Reporting

Report failures, checks you could not run, and what the checks do not cover. Passing checks do not establish behavior they do not exercise. Put verification limits in the PR's risk section.

## Automated reviews

Two advisory OpenCode agents review PRs: `review` for code quality and `contribution-review` for whether an issue or PR is clear enough to act on. Their instructions are in `.opencode/agents/` and their triggers in `.github/workflows/`. They need the `AI_GATEWAY_API_KEY` Actions secret. To preview a code review locally:

```sh
opencode run --standalone --auto --agent review --model vercel/openai/gpt-6-luna \
  "Preview PR #123 in weng-lab/genomebrowser. Reply with the proposed comments and their locations; do not post or change anything on GitHub."
```
