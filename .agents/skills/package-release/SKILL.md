---
name: package-release
description: Prepare genomebrowser package releases, recommend versions or use maintainer-specified versions, hand off human npm publication, and manage GitHub release drafts or publication when requested. Excludes standalone app deployment.
---

# Package release

Read [release guidance](../../../docs/tooling/releases.md) for version selection, validation, publishing responsibilities, and release-note conventions. It is the shared authority. Links are relative to this skill.

1. Establish the requested stage and package scope. Inspect current manifests, publishing scripts, the working tree, npm versions and tags, and existing GitHub releases. Find each package's verified publication baseline and compare it with the intended release commit.
2. Present the affected packages, consumer changes, and maintainer-specified or recommended versions. Resolve any uncertainty that could change the version or release channel before updating files. Do not infer a beta requirement from existing configuration.
3. For authorized preparation, update versions, necessary dependency minimums, channel configuration, lockfile, and affected docs. Read the template's AGENTS.md if changing it. Follow the linked verification and schema guidance. Inspect packed artifacts and dry-run the intended selection.
4. Prepare package-specific notes and GitHub drafts within the requested scope. Follow [contribution guidance](../../../docs/contributing/README.md) for requested commits or PRs. Use structured text arguments or a notes file for multiline release bodies.
5. Hand off the exact npm publishing command and validated release details to the human, following the publication boundary in the release guide. After the human publishes, verify npm read-only and identify any partial failures.
6. When separately requested, publish the GitHub releases after confirming npm publication. Verify their tags, target commits, prerelease status, and resulting links. Report completed releases and any remaining work. Distinguish drafts from published releases.
