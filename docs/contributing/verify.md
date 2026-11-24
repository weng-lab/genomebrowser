# Verifying changes

Before handoff, run `pnpm format`, `pnpm verify`, and `pnpm run doctor` from the repository root. A failed format check means run `pnpm format` and verify again, not report it.

`pnpm verify` skips:

- Web database, relay, and MCP tests without test servers; see [the web app README](../../apps/web/README.md#tests). CI runs them.
- Browser tests: `pnpm tracks test:e2e`.
- The Rust converter: `cargo test --manifest-path tools/gtf-to-big-gene-pred-plus/Cargo.toml --locked`.

Run them when your change touches what they cover, and say in the PR's risk section what you could not run.

## Evidence

Match PR and bug-report evidence to the kind of change:

- Visual bug fix or state change: one or two screenshots showing the broken and fixed (or before and after) state.
- Multi-step interaction or new feature flow: a short video recording of the flow.
- Non-visual change (refactor, performance optimization, render budget, API or schema change): a short Markdown table or list of before and after values, timings, or counts.

Keep PR bodies tidy when attaching media:

- Attach screenshots and videos directly to the PR or issue; never commit them to the repository.
- Put before and after (or broken and fixed) screenshots side by side in a Markdown table instead of stacking full-width images inline.
- Size tall or large images with `<img src="..." width="..." alt="..." />` when full width overwhelms the description.
- Collapse extra screenshots, videos, or longer measurement tables inside `<details><summary>...</summary>...</details>` so the summary, review guide, and risk stay scannable.

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
