---
name: github-contribution
description: Help draft new genomebrowser feature requests through simple Q&A, and prepare or update GitHub issues, pull requests, and commits. Use for contribution handoff and metadata, not ordinary implementation or package releases.
---

# GitHub contribution

Read [contribution guidance](../../../docs/02-contributing/README.md) and the relevant template in `.github/`. For PR handoff, also read [verification guidance](../../../docs/02-contributing/verify.md). Paths in these links are relative to this skill.

1. Identify the requested operation, current diff, and related issue or PR. Load only the context needed for that contribution.
   For user-facing features, use `.github/ISSUE_TEMPLATE/feature.md`: user stories, designs, and additional context. Keep one parent feature issue, with optional task checkboxes or sub-issues linking back to it. Do not add mandatory planning or acceptance-criteria sections. Focused technical changes can use `change.md`.
2. Inspect repository labels and [resolve the contributor's GitHub account](../../../docs/02-contributing/README.md#resolve-the-contributors-github-account) before setting metadata. Use the documented Git and GitHub CLI checks; ask only when the available evidence leaves the identity unclear. Follow the shared guidance for attribution and writing.
3. Prepare the requested commit, issue, or PR from the actual scope. For a PR, explain the implementation and direct review to its key files. Follow the verification guidance at handoff.
4. Perform only the operations authorized by the user. A request to implement code does not by itself authorize posting issues, creating PRs, or merging. When updating an existing contribution, preserve unrelated content and metadata.
5. Check the resulting text and metadata against the final change, and report the outcome with the issue or PR link when applicable.

## New feature requests

Keep the walkthrough conversational. Use what the user has already told you, check for an existing issue, and ask one short question at a time only where information is missing:

- What should the user be able to do?
- Is there a Figma link or mockup? A placeholder is fine.
- Any other context or open questions worth keeping?

Draft a title and the template's three sections: User stories, Designs, and Additional context. Leave undecided details as questions rather than inventing requirements. Show the draft for review before posting, unless the user has already approved the wording and authorized posting. Keep implementation breakdowns for later unless requested.
