# Contributing

All changes go through a pull request to keep main's history clean. Aim for one feature, fix, removal, or refactor per PR. Larger changes are sometimes necessary, but keep the work connected and leave unrelated cleanup for another contribution.

## Verification guides

- [Testing](testing.md): choose meaningful tests for a change.
- [Verifying changes](verify.md): run the required workspace checks.

## Issues and ownership

Prefer an issue before code changes so the intended work has a place for discussion and can be linked to its PR. A missing issue does not prevent a contribution. State the desired outcome first, then the context, constraints, or blockers needed to understand it. Use the [bug report template](../../.github/ISSUE_TEMPLATE/bug_report.md) for incorrect behavior and the [change template](../../.github/ISSUE_TEMPLATE/change.md) for proposed work.

Apply relevant repository labels to issues and PRs. Assign the contributor responsible for the work. When an agent acts for someone, identify that person's GitHub account rather than defaulting to the repository maintainer or the agent's account. Preserve contributor credit and leave uncertain metadata unset until the identity or label is established.

### Resolve the contributor's GitHub account

Use an account explicitly identified by the user for this work first. Otherwise, inspect the effective Git author and the authenticated GitHub account from the repository directory:

```sh
git remote -v
git var GIT_AUTHOR_IDENT
gh api --hostname github.com user --jq '{login, name, type}'
```

Use the target repository's GitHub host in place of `github.com` when needed. `git var GIT_AUTHOR_IDENT` includes author environment overrides as well as Git configuration. To investigate an unexpected identity, use `git config --show-origin --get-regexp '^user\.(name|email)$'`.

The API result identifies the account whose credentials `gh` is using. Treat it as the assignee when the session context and Git author support that it belongs to the person requesting the work. A matching name is supporting evidence, not a unique account identifier. Git author names and email addresses alone do not establish a GitHub login, and Git cannot identify who made uncommitted edits.

If the credentials belong to a bot or shared account, the identities conflict, or the contributor remains unclear, ask for the contributor's GitHub login and leave the assignee unset while continuing other work. Do not infer ownership from the repository owner, the last commit on the default branch, or the PR creator alone. Do not switch authentication or change Git identity just to make them match.

Once resolved, use the explicit login with `gh pr create --assignee LOGIN` or `gh pr edit PR_NUMBER --add-assignee LOGIN`. These are assignment flags to use during an authorized PR operation. [`@me` means the authenticated account](https://cli.github.com/manual/gh_pr_create), so use it only when that account is the resolved contributor. Preserve unrelated existing assignees. Verify the resulting assignment with `gh pr view PR_NUMBER --json assignees --jq '.assignees[].login'`.

## Branches and commits

Choose a branch name that describes the work. Write short, specific commit messages in the imperative mood, such as `Fix track error message layout`. Do not add category prefixes such as `feat:` or `perf:`, or use vague messages such as `changes`. Branch names, issue titles, and PR titles must not start with `codex/`.

## Pull requests

Use a short, specific title in the same style as a commit message. Open a draft when the maintainer wants CI to run or the work tracked remotely. There is no required stage of completion for a draft.

Give the reviewer a concise guide to the implementation. State the problem and resulting behavior, then explain how the change achieves it and why that approach fits. Point to the few files where the important decisions or bulk of the change live. Describe the final implementation rather than recounting the agent's investigation or listing everything it accomplished. Scale the detail to the change.

Use the [PR template](../../.github/pull_request_template.md). Include brief manual review steps when they help someone exercise the behavior. Screenshots and videos are welcome when the maintainer wants them, but are not required. Automated check lists and logs need not be copied from CI into the description; mention unresolved failures or verification limits that affect review.

End the description with `Closes #123` when the PR resolves that issue. Before handoff, follow [verification guidance](verify.md) and update the description, labels, and assignee to reflect the final scope. Maintainers handle merging.

For changes to shared dependencies, follow the [dependency policy](../03-tooling/dependencies.md).

Return to [Parent documentation](../README.md).
