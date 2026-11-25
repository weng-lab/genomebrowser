---
name: github-contribution
description: Help draft new genomebrowser feature requests through simple Q&A, and prepare, update, or comment on GitHub issues, pull requests, and commits (including media attachments and agent attribution). Use for any GitHub contribution, not ordinary implementation or package releases.
---

# GitHub contribution

Follow [contributing](../../../docs/contributing/README.md) and the matching template in `.github/`.

1. Prepare the commit, issue, or PR from the actual change. Follow the template's comments and include matching evidence ([evidence](../../../docs/contributing/verify.md#evidence)).
2. Before setting an assignee, resolve the contributor's GitHub login:
   - Use a login the user named for this work.
   - Otherwise compare `git var GIT_AUTHOR_IDENT` with `gh api user --jq '{login, name, type}'`. Use that login only when it plausibly belongs to the person asking; a matching name is evidence, not proof.
   - If the account is a bot or shared, the identities conflict, or it stays unclear, ask and leave the assignee unset. Never assume the repository owner or PR creator, and never change auth or Git identity to make them match.
   - Assign with `gh pr create --assignee LOGIN` or `gh pr edit N --add-assignee LOGIN`, keep existing assignees, and confirm with `gh pr view N --json assignees`.
3. Post, open, or merge only what the user authorized; implementing code does not authorize any of them. When updating an existing issue or PR, keep unrelated content and metadata.

## Attaching media

Never commit screenshots or recordings to the repository. Upload images and videos to an issue, PR, or comment with `gh`'s `--attach` flag (`gh` 2.99.0+) on `gh pr create`, `gh pr edit`, `gh pr comment`, or `gh issue create`/`comment`. Supported formats: PNG, JPEG, GIF, WebP, and SVG (up to 10 MB), plus MP4, MOV, and WebM videos (10 MB free / 100 MB paid). Reference the local file paths in the Markdown body (for example in a side-by-side table or `<img src="./after.png" width="420" alt="..." />`) and pass `--attach ./after.png` for each file so `gh` uploads it to GitHub and rewrites the path to the hosted asset URL in place, or pass `--attach "./shot.png#Alt text"` to append it.

## Agent attribution

End every agent-written GitHub issue, PR description, or comment with a single-line blockquote naming the model and platforms or apps used, bolding both:

> Written with **<Model>** via **<Platforms/Apps>**

For example: `> Written with **Claude Opus 5.5** via **Claude Code in T3 Code**`. Use human-readable names and include only what you know from your runtime context; omit unknown tools or versions instead of guessing.

## New feature requests

Use what the user already said and check for an existing issue. Ask one short question at a time for what is missing:

- What should the user be able to do?
- Is there a Figma link or mockup? A placeholder is fine.
- Any other context or open questions?

Draft a title with User stories, Designs, and Additional context, leaving undecided details as questions. Show the draft before posting unless the user already approved the wording and posting.
