---
name: github-contribution
description: Help draft new genomebrowser feature requests through simple Q&A, and prepare or update GitHub issues, pull requests, and commits. Use for contribution handoff and metadata, not ordinary implementation or package releases.
---

# GitHub contribution

Follow [contributing](../../../docs/contributing/README.md) and the matching template in `.github/`.

1. Prepare the commit, issue, or PR from the actual change. For a PR, fill the body by following the template's comments.
2. Before setting an assignee, resolve the contributor's GitHub login:
   - Use a login the user named for this work.
   - Otherwise compare `git var GIT_AUTHOR_IDENT` with `gh api user --jq '{login, name, type}'`. Use that login only when it plausibly belongs to the person asking; a matching name is evidence, not proof.
   - If the account is a bot or shared, the identities conflict, or it stays unclear, ask and leave the assignee unset. Never assume the repository owner or PR creator, and never change auth or Git identity to make them match.
   - Assign with `gh pr create --assignee LOGIN` or `gh pr edit N --add-assignee LOGIN`, keep existing assignees, and confirm with `gh pr view N --json assignees`.
3. Post, open, or merge only what the user authorized; implementing code does not authorize any of them. When updating an existing issue or PR, keep unrelated content and metadata.

## New feature requests

Use what the user already said and check for an existing issue. Ask one short question at a time for what is missing:

- What should the user be able to do?
- Is there a Figma link or mockup? A placeholder is fine.
- Any other context or open questions?

Draft a title with User stories, Designs, and Additional context, leaving undecided details as questions. Show the draft before posting unless the user already approved the wording and posting.
