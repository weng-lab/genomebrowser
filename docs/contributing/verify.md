# Verifying changes

Before handoff, run `pnpm format`, `pnpm verify`, and `pnpm run doctor` from the repository root. A failed format check means run `pnpm format` and verify again, not report it.

`pnpm verify` skips:

- Web database, relay, and MCP tests without test servers; see [the web app README](../../apps/web/README.md#tests). CI runs them.
- Browser tests: `pnpm tracks test:e2e`.
- The Rust converter: `cargo test --manifest-path tools/gtf-to-big-gene-pred-plus/Cargo.toml --locked`.

Run them when your change touches what they cover, and say in the PR's risk section what you could not run.

## Lint

Suppress an intended exception with `oxlint-disable-next-line <rule> -- <reason>`; unused suppressions fail. Use `react-doctor-disable-next-line` for React Doctor-only findings. Do not add catch-and-log helpers to satisfy `no-floating-promises`. Import boundaries live in `.oxlintrc.json` with examples in `tools/lint/policy.test.mjs`; change both together.

## React Doctor

It does not block merging. Report findings your change caused and leave existing ones.

## Automated reviews

The advisory OpenCode reviewers' instructions are in `.opencode/agents/` and their triggers in `.github/workflows/`. Preview a code review locally with:

```sh
opencode run --standalone --auto --agent review --model vercel/openai/gpt-6-luna \
  "Preview PR #123 in weng-lab/genomebrowser. Reply with the proposed comments and their locations; do not post or change anything on GitHub."
```
