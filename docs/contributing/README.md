# Contributing

Every change goes through a pull request with one purpose: one feature, fix, removal, or refactor. Leave unrelated cleanup for another PR. Maintainers merge.

## Issues

Open an issue first when the work needs discussion, using a template in `.github/ISSUE_TEMPLATE/`: `feature.md` for a user-facing feature (user stories, designs, open questions), `bug_report.md` for incorrect behavior, `change.md` for a focused technical change. A feature gets one issue; break it down with checkboxes or sub-issues.

Set the native issue Type (Feature, Task, or Bug), not a label. Labels name areas such as app, core, or UI. The January MVP milestone tracks launch work. Assign the contributor doing the work, never by default the maintainer or an agent's account.

## Commits, branches, and PRs

Commit messages and PR titles are short and imperative, such as `Fix track error message layout`, without prefixes like `feat:`. Branch names, issue titles, and PR titles never start with `codex/`. Write the PR body by following the comments in `.github/pull_request_template.md`.

Before handoff, follow [verify](verify.md), and make the PR's description, labels, and assignee match the final change.

Shared dependency changes follow [tooling](../tooling/README.md#dependencies).
