# Contributing

All changes go through a pull request to keep main's history clean. Aim for one feature, fix, removal, or refactor per PR. Larger changes are sometimes necessary, but keep the work connected and leave unrelated cleanup for another contribution.

## Issues and ownership

Prefer an issue before code changes so the intended work has a place for discussion and can be linked to its PR. A missing issue does not prevent a contribution. State the desired outcome first, then the context, constraints, or blockers needed to understand it. Use the [bug report template](../../.github/ISSUE_TEMPLATE/bug_report.md) for incorrect behavior and the [change template](../../.github/ISSUE_TEMPLATE/change.md) for proposed work.

Apply relevant repository labels to issues and PRs. Assign the contributor responsible for the work. When an agent acts for someone, identify that person's GitHub account rather than defaulting to the repository maintainer or the agent's account. Preserve contributor credit and leave uncertain metadata unset until the identity or label is established.

## Branches and commits

Choose a branch name that describes the work. Write short, specific commit messages in the imperative mood, such as `Fix track error message layout`. Do not add category prefixes such as `feat:` or `perf:`, or use vague messages such as `changes`. Branch names, issue titles, and PR titles must not start with `codex/`.

## Pull requests

Use a short, specific title in the same style as a commit message. Open a draft when the maintainer wants CI to run or the work tracked remotely. There is no required stage of completion for a draft.

Give the reviewer a concise guide to the implementation. State the problem and resulting behavior, then explain how the change achieves it and why that approach fits. Point to the few files where the important decisions or bulk of the change live. Describe the final implementation rather than recounting the agent's investigation or listing everything it accomplished. Scale the detail to the change.

Use the [PR template](../../.github/pull_request_template.md). Include brief manual review steps when they help someone exercise the behavior. Screenshots and videos are welcome when the maintainer wants them, but are not required. Automated check lists and logs need not be copied from CI into the description; mention unresolved failures or verification limits that affect review.

End the description with `Closes #123` when the PR resolves that issue. Before handoff, follow [verification guidance](verify.md) and update the description, labels, and assignee to reflect the final scope. Maintainers handle merging.

For changes to shared dependencies, follow the [dependency policy](../tooling/dependencies.md).
