# Verifying changes

Run `pnpm verify` from the repository root before handing off a PR. It runs the configured formatting, lint, build, and test tasks across the workspace through Turborepo. The first run can be slow. Subsequent runs reuse cached results for unchanged inputs, so changes spanning packages do not require manually selecting each package's checks.

Direct checks are useful while iterating. For example, `pnpm core test` runs core's tests. Use the affected package's configured commands for focused feedback, then use `pnpm verify` for the workspace check before handoff.

## Coverage

Run `pnpm core test:coverage` to generate a core coverage report at `packages/core/coverage/index.html`. Open it in a browser to inspect uncovered lines and branches. The report includes all core source files, including files no test imports. Use gaps to investigate missing behavior coverage; a covered line does not prove that a test asserts its result. Coverage is optional and has no percentage threshold.

## Additional checks

Run `pnpm run doctor` before PR handoff and report relevant React Doctor findings. This is a separate diagnostic pass, not part of `pnpm verify`. Its CI workflow is nonblocking. Distinguish findings caused by the change from existing findings; do not expand a focused contribution into unrelated cleanup.

CI and local React Doctor versions can report different findings. Compare their versions and results before deciding which findings need attention. Update the versions when needed and review findings from both runs.

For changes to the Rust conversion tool, also run:

```sh
cargo test --manifest-path tools/gtf-to-big-gene-pred-plus/Cargo.toml --locked
```

CI runs this separately from the workspace tasks. It is not included in `pnpm verify`.

## Formatting

Run `pnpm format` from the repository root before committing and handing off the change. It runs the workspace formatting tasks through Turborepo. For work in one package, use its formatting script, such as `pnpm core format`, or run `pnpm format` from that package's directory. Package scripts format the whole package; there is no need to list changed files individually.

A failed formatting check is work to finish, not just a result to report. Apply the formatter, review the resulting diff, and run `pnpm verify` so CI does not need a follow-up formatting commit.

## Reporting results

Report failures, checks that could not run, and any remaining uncertainty about the changed behavior. Passing automated checks does not establish behavior they do not exercise. Keep PR descriptions focused on the implementation and relevant review limits rather than copying check logs.

## Automated PR review

The PR review workflow uses OpenCode and GPT-6 Luna through Vercel AI Gateway to review repository conformity, code quality, and PR scope. Add a Vercel AI Gateway API key as the `AI_GATEWAY_API_KEY` repository Actions secret to enable it. The agent must already exist on the PR's base branch, so the workflow can run after its initial setup is merged.

Reviews run when a PR opens, receives commits, reopens, or becomes ready for review. Drafts, fork PRs, and Dependabot events are skipped. The agent uses Git and `gh` to inspect the contribution and manage its review comment, starting with instructions from the base revision.

The code reviewer never runs `pnpm verify` or other verification commands, installs dependencies, or triggers CI. It reviews source, tests, documentation, and existing CI evidence for code quality and repository conformity. Instructions to run checks in contribution guides and skills apply to implementation work, not the reviewer. Pending checks do not prevent the quality review.

Findings appear in one bot comment that is updated on reruns and removed when a completed review has no findings. Blocking labels are recommendations for the team, not an automatic merge gate. Incomplete reviews are reported in the job output. Keep this job advisory rather than adding it to required branch checks.

To preview a review from a worktree containing the agent, authenticate `gh`, provide Vercel AI Gateway credentials to OpenCode, and run the following command with the PR number to review. Preview also works for closed or merged PRs and does not change GitHub comments.

```sh
opencode run --standalone --auto --agent review --model vercel/openai/gpt-6-luna \
  "Preview PR #123 in weng-lab/genomebrowser. Reply with the proposed comment; do not post or change anything on GitHub."
```

## Contribution clarity review

The separate contribution review workflow checks whether issues and PRs provide enough information to act. It accepts short descriptions and reasonable differences from the templates. It asks for clarification only when missing or conflicting information prevents useful work, and does not change titles, descriptions, or metadata.

It runs on opening, editing, or reopening an issue or PR, and when a draft PR becomes ready. Bot events, draft PRs, and fork PRs are skipped. Label changes, comments, and new commits alone do not trigger it. An edit to the title or body triggers a fresh review that also considers the discussion. The agent updates one advisory comment and removes it when clarification is no longer needed.

It uses the same `AI_GATEWAY_API_KEY` secret as the code reviewer. The issue workflow must exist on the default branch, and the agent must exist in the checked-out default or PR base revision. To preview locally, use `--agent contribution-review` in the command above and specify an issue or PR number.
