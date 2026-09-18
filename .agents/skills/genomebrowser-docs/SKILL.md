---
name: genomebrowser-docs
description: Organize and maintain bundled genomebrowser package docs and repository maintainer guidance, including documentation updates for public behavior or API changes. Covers audits and documentation migrations; edit ADRs only when requested. Excludes commit messages, TODO files, and code comments unless requested.
---

# Genomebrowser docs

## Load the relevant guidance

Read [Writing documentation](../../../docs/documentation/writing.md) for shared evidence, example, and style requirements. Then read only the references needed for the task:

- Package page creation, placement, tutorials, audits, or restructuring: [Package documentation architecture](../../../docs/documentation/packageArchitecture.md). A wording-only edit does not require this page.
- Public components, functions, hooks, stores, module contracts, types, or other APIs: [API reference writing](../../../docs/documentation/apiReference.md).
- Maintainer docs, app READMEs, architecture, contribution/design guidance, or requested ADR work: [Maintainer documentation](../../../docs/documentation/maintainerDocs.md).
- Changes to where shared guidance lives or how agents find it: [Documentation and agent guidance](../../../docs/documentation/README.md).

Links are relative to this skill file. These documents live in the repository and are the shared authority; do not keep duplicate policy in the skill.

## Workflow

For discussion or an audit, propose the audience, page map, and content approach before editing. When documentation edits or a package pass are authorized, complete that scope without approval for each page. Documentation required by an implementation change is already in scope. Edit ADRs only when requested, and do not expand a focused change into a package-wide migration.

1. Read the existing pages and relevant repository instructions. Find the page that owns each explanation. Identify affected examples, API tables, tutorials, troubleshooting entries, and architectural claims. Verify behavioral claims against public entry points, implementation, and tests. Distinguish maintainer intent from implemented behavior.
2. For a restructuring or package pass, inventory pages, inbound links, packaged contents, and public exports. List the pages to keep, move, merge, rewrite, or retire before writing. Work package by package within the authorized scope. An accepted page list does not need repeated approval.
3. Rewrite affected explanations and examples to describe the resulting behavior. Preserve useful rationale, remove obsolete or conflicting guidance, and update navigation and inbound links. Do not retire legacy material until its useful content has a current home or has deliberately been retired.
4. Read the changed pages as a whole for flow, duplication, contradictions, and dependence on historical context. For maintainer pages, check that the content helps someone make decisions rather than paraphrasing implementation.
5. Validate the affected API coverage, examples, links, heading targets, and package inclusion. Review titles, filenames, and index descriptions together when scope changes. Type-check or run examples when practical and use repository verification tools. Validate the resulting docs, not only the added text.
6. Report files changed, validation, and material uncertainty. Distinguish completed documentation from proposals and unfinished migration work.

For a broader package migration without a user-specified order, start with core, tracks, UI, reader, then starter/generated guides and app READMEs, and finally maintainer docs. This is an ordering aid, not authorization to expand the task. Complete reference coverage does not replace useful tutorials, guides, or troubleshooting.
